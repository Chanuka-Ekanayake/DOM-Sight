import { computeShape, shapeWalker, buildSelector, createDomShapeCollector } from './domShape';
import { OVERLAY_HOST_ID } from '../../shared/defaults';

function grid(rows: number, cols: number): string {
  const tr = `<tr>${'<td></td>'.repeat(cols)}</tr>`;
  return `<div id="grid"><table><tbody>${tr.repeat(rows)}</tbody></table></div>`;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('buildSelector', () => {
  it('uses tag#id and stops at the first id', () => {
    document.body.innerHTML = '<div id="app"><section class="a b c"><ul></ul></section></div>';
    const ul = document.querySelector('ul')!;
    expect(buildSelector(ul)).toBe('div#app > section.a.b > ul');
  });

  it('limits the chain to three levels when no id is found', () => {
    document.body.innerHTML = '<main><div><p><em></em></p></div></main>';
    expect(buildSelector(document.querySelector('em')!)).toBe('div > p > em');
  });
});

describe('computeShape', () => {
  it('measures max depth counting html as depth 1', () => {
    document.body.innerHTML = '<div><div><div></div></div></div>';
    // html(1) > body(2) > div(3) > div(4) > div(5)
    expect(computeShape(document.documentElement).maxDepth).toBe(5);
  });

  it('finds the parent with the most element children', () => {
    document.body.innerHTML = '<ul>' + '<li></li>'.repeat(7) + '</ul><div><p></p><p></p></div>';
    const s = computeShape(document.documentElement);
    expect(s.widestParent).toEqual({ selector: 'body > ul', children: 7 });
  });

  it('reports the tbody as the heaviest hub, not the pass-through wrappers', () => {
    document.body.innerHTML = '<header><a></a></header>' + grid(50, 4);
    const s = computeShape(document.documentElement);
    expect(s.heaviest[0]).toEqual({ selector: 'div#grid > table > tbody', nodes: 250, depth: 2 });
  });

  it('never lists html or body as a hub', () => {
    document.body.innerHTML = grid(10, 2) + '<section>' + '<p></p>'.repeat(30) + '</section>';
    const s = computeShape(document.documentElement);
    expect(s.heaviest.map((h) => h.selector)).not.toContain('html');
    expect(s.heaviest.map((h) => h.selector)).not.toContain('body');
  });

  it('returns at most five hubs ranked by descendant count', () => {
    let html = '';
    for (let i = 0; i < 8; i++) html += `<ul class="l${i}">${'<li></li>'.repeat(20 + i * 5)}</ul>`;
    document.body.innerHTML = html;
    const s = computeShape(document.documentElement);
    expect(s.heaviest).toHaveLength(5);
    expect(s.heaviest.map((h) => h.nodes)).toEqual([55, 50, 45, 40, 35]);
  });

  it('ignores the HUD host and everything inside it', () => {
    document.body.innerHTML = `<div id="${OVERLAY_HOST_ID}">${'<i></i>'.repeat(100)}</div><p></p>`;
    const s = computeShape(document.documentElement);
    expect(s.widestParent.children).toBe(2); // body: host + p
    expect(s.heaviest).toEqual([]);
    expect(s.maxDepth).toBe(3);
  });
});

describe('shapeWalker (time-sliced)', () => {
  it('yields at least once on a large tree and produces the same result as computeShape', () => {
    document.body.innerHTML = grid(300, 5);
    const gen = shapeWalker(document.documentElement);
    let yields = 0;
    let step = gen.next();
    while (!step.done) {
      yields++;
      step = gen.next();
    }
    expect(yields).toBeGreaterThan(0);
    expect(step.value).toEqual(computeShape(document.documentElement));
  });
});

describe('domShape collector', () => {
  type IdleCb = (deadline: { timeRemaining(): number }) => void;
  let pending: IdleCb[];
  const ric = (cb: IdleCb) => {
    pending.push(cb);
  };
  /** Run queued idle callbacks with a generous deadline until none remain. */
  const drainIdle = () => {
    while (pending.length) pending.shift()!({ timeRemaining: () => 50 });
  };

  beforeEach(() => {
    pending = [];
    vi.useFakeTimers();
    document.body.innerHTML = grid(30, 3);
  });
  afterEach(() => vi.useRealTimers());

  it('emits depth, widest parent and heaviest after the first idle walk', () => {
    const emits: unknown[] = [];
    const c = createDomShapeCollector({ everyMs: 2000, requestIdle: ric });
    c.start((m) => emits.push(m));
    expect(emits).toHaveLength(0);
    drainIdle();
    expect(emits).toEqual([computeShape(document.documentElement)]);
    c.stop();
  });

  it('does not walk again while the DOM is unchanged', async () => {
    const emits: unknown[] = [];
    const c = createDomShapeCollector({ everyMs: 2000, requestIdle: ric });
    c.start((m) => emits.push(m));
    drainIdle();
    await vi.advanceTimersByTimeAsync(6000);
    drainIdle();
    expect(emits).toHaveLength(1);
    c.stop();
  });

  it('walks again on the next interval after a mutation', async () => {
    const emits: { maxDepth?: number }[] = [];
    const c = createDomShapeCollector({ everyMs: 2000, requestIdle: ric });
    c.start((m) => emits.push(m));
    drainIdle();
    document.body.appendChild(document.createElement('div')).appendChild(document.createElement('div'));
    await vi.advanceTimersByTimeAsync(2000); // lets MutationObserver microtask + interval fire
    drainIdle();
    expect(emits).toHaveLength(2);
    c.stop();
  });

  it('resumes across idle callbacks when the time slice is exhausted', () => {
    document.body.innerHTML = grid(400, 5);
    let t = 0;
    const now = () => (t += 5); // each call advances 5ms -> slice of 8ms is exhausted after one step
    const emits: unknown[] = [];
    const c = createDomShapeCollector({ everyMs: 2000, sliceMs: 8, requestIdle: ric, now });
    c.start((m) => emits.push(m));
    let callbacks = 0;
    while (pending.length) {
      callbacks++;
      pending.shift()!({ timeRemaining: () => 50 });
    }
    expect(callbacks).toBeGreaterThan(1);
    expect(emits).toEqual([computeShape(document.documentElement)]);
    c.stop();
  });

  it('never emits after stop(), even with a walk in flight', () => {
    const emits: unknown[] = [];
    const c = createDomShapeCollector({ everyMs: 2000, requestIdle: ric });
    c.start((m) => emits.push(m));
    c.stop();
    drainIdle();
    expect(emits).toHaveLength(0);
  });
});
