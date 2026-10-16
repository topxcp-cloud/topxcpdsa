import useReveal from "./hook/useReveal.js";
import { NEW_STUDENTS, initials, tagOf } from './data.js';
import { Badge, Count, Flame, Movement, YouTag } from './common.jsx';

const SUFFIX = ['CHAMPION', 'RUNNER-UP', '3RD PLACE'];
const DELAY = [0.3, 0.14, 0]; // bronze first, then silver, then the winner

function PodiumCard({ student: d, index: i, me, pinged, prevRank }) {
  const [ref, visible] = useReveal(false);
  const delay = DELAY[i] + 0.25;
  const cls = ['pc', 'r' + (i + 1), 'reveal', visible && 'visible', d.n === me && 'me', d.n === pinged && 'hit ping']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} ref={ref} data-name={d.n}>
      <i className="sh" />
      <Badge index={i} />
      <div className="rk rank-display">
        <span className="rank-medal">
          <span className="rank-num">{i + 1}</span>
          <span className="rank-suffix">{SUFFIX[i]}</span>
        </span>
        <span className="rank-movement">
          <Movement index={i} prevRank={prevRank?.[d.n]} isNew={!!NEW_STUDENTS[d.n]} />
        </span>
      </div>
      <div className="who">
        <span className="av">{initials(d.n)}</span>
        <div>
          <div className="nm">
            {d.n}
            {d.n === me && <YouTag />}
          </div>
          <div className="tg">{tagOf(d)}</div>
        </div>
      </div>
      <div className="st">
        <div>
          <b>
            <Count to={d.s ?? 0} run={visible} delay={delay} />
          </b>
          <span>problems solved</span>
        </div>
        <div>
          <b>
            <Count to={d.currentStreak ?? 0} run={visible} delay={delay} />
          </b>
          <span>
            <Flame />
            day streak
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Podium({ top, viewKey, ...rest }) {
  // Visual order: 2nd, 1st, 3rd (the DOM order the original used).
  const order = [1, 0, 2].filter((i) => top[i]);
  return (
    <div className="pod" id="pod">
      {order.map((i) => (
        <PodiumCard key={viewKey + '|' + top[i].n} student={top[i]} index={i} {...rest} />
      ))}
    </div>
  );
}
