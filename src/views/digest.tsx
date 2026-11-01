import type { NightDigest } from '../digest/types.js';

// One table, sorted by job. A fail marks the row; three or more retries mark the retries cell.
export function Digest({ digest }: { digest: NightDigest }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last</th>
              <th>error</th>
              <th>first</th>
              <th>last seen</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => (
              <tr class={r.lastStatus === 'fail' ? 'warn' : ''}>
                <td>{r.job}</td>
                <td>{r.owner ?? '—'}</td>
                <td>{r.runs}</td>
                <td class={r.retries >= 3 ? 'warn' : ''}>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{r.lastError ?? '—'}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 ? (
        <p class="mute">
          {digest.badLines} line{digest.badLines === 1 ? '' : 's'} could not be read.
        </p>
      ) : null}
    </>
  );
}
