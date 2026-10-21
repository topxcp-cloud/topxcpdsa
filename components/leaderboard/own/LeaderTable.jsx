import { forwardRef } from 'react';
import useReveal from "./hook/useReveal.js";
import { NEW_STUDENTS, PAGE_SIZE, initials, studentKey, tagOf } from './data.js';
import { Count, Flame, Movement, YouTag } from './common.jsx';

function Row({ student: d, rank, rowIndex, instant, meKey, pinged, prevRank, maxScore }) {
  const [ref, visible] = useReveal(instant);
  const delay = Math.min(rowIndex, 6) * 0.05;
  const key = studentKey(d);
  const cls = ['reveal', visible && 'visible', key === meKey && 'me', key === pinged && 'hit ping']
    .filter(Boolean)
    .join(' ');

  const score = d.s ?? 0;

  return (
    <tr className={cls} ref={ref} data-student-key={key} style={{ '--d': delay + 's' }}>
      <td className="rc n">
        <span className="rb">{rank}</span>
        <Movement index={rank - 1} prevRank={prevRank?.[d.n]} isNew={!!NEW_STUDENTS[d.n]} />
      </td>
      <td>
        <div className="pn">
          <span className="av">
            {d.avatar ? (
              <img src={d.avatar} alt={d.n} referrerPolicy="no-referrer" />
            ) : (
              initials(d.n)
            )}
          </span>
          {d.n}
          {key === meKey && <YouTag />}
        </div>
        <div className="mt">{tagOf(d)}</div>
      </td>
      <td>
        <div className="sv">
          <span className="n">
            <Count to={score} run={visible} delay={delay + 0.25} animate={!instant} />
          </span>
          <i style={{ '--w': Math.max(0, Math.min(100, Math.round((score / maxScore) * 100))) + '%' }} />
        </div>
      </td>
      <td>
        <span className="stk n">
          <Flame />
          {d.currentStreak ?? 0} days
        </span>
      </td>
    </tr>
  );
}

// `rows` = everything below the podium (rank 4+); `page` is 1-based.
const LeaderTable = forwardRef(function LeaderTable(
  { rows, topScore, page, instant, viewKey, ...rest },
  tbodyRef
) {
  const offset = (page - 1) * PAGE_SIZE;
  const slice = rows.slice(offset, offset + PAGE_SIZE);
  const maxScore = topScore || 1;

  return (
    <div className="tbw">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Student</th>
            <th>Problems solved</th>
            <th>Current streak</th>
          </tr>
        </thead>
        <tbody id="tb" ref={tbodyRef}>
          {slice.map((d, i) => (
            <Row
              key={viewKey + '|' + page + '|' + (d.id || d.n) + '|' + i}
              student={d}
              rank={i + 4 + offset}
              rowIndex={i}
              instant={instant}
              maxScore={maxScore}
              {...rest}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default LeaderTable;
