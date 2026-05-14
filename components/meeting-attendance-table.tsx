import Link from "next/link";
import type { MeetingAttendanceItem } from "@/lib/ttcs-data";

function getStatusClass(statusLabel: MeetingAttendanceItem["statusLabel"]) {
  switch (statusLabel) {
    case "Missed":
      return "attendance-status attendance-status-missed";
    case "Closed":
      return "attendance-status attendance-status-closed";
    case "Completed":
      return "attendance-status attendance-status-completed";
    case "In Call":
      return "attendance-status attendance-status-live";
    default:
      return "attendance-status attendance-status-pending";
  }
}

function isMeetingClosed(record: MeetingAttendanceItem) {
  const closeAt = record.meetingEndsAt ?? record.meetingStartsAt;
  return new Date(closeAt).getTime() < Date.now();
}

export function MeetingAttendanceTable({
  records,
  title,
  description,
  emptyMessage,
}: {
  records: MeetingAttendanceItem[];
  title: string;
  description: string;
  emptyMessage: string;
}) {
  return (
    <section className="page-card">
      <div className="card-headline">
        <div>
          <h3>{title}</h3>
          <p className="meeting-card-copy">{description}</p>
        </div>
        <span className="pill meeting">{records.length} Records</span>
      </div>

      {records.length ? (
        <div className="attendance-table-wrap">
          <div className="attendance-table-shell">
            <table className="attendance-table">
              <colgroup>
                <col className="attendance-col-meeting" />
                <col className="attendance-col-schedule" />
                <col className="attendance-col-time" />
                <col className="attendance-col-time" />
                <col className="attendance-col-status" />
                <col className="attendance-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Meeting</th>
                  <th scope="col">Schedule</th>
                  <th scope="col">Time-in</th>
                  <th scope="col">Time-out</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const meetingClosed = isMeetingClosed(record);
                  const actionLabel = meetingClosed ? "Room Closed" : "Open Room";

                  return (
                    <tr key={record.meetingId}>
                      <td className="attendance-cell" data-label="Meeting">
                        <div className="attendance-meeting-cell">
                          <span className="attendance-primary">{record.meetingTitle}</span>
                        </div>
                      </td>
                      <td className="attendance-cell" data-label="Schedule">
                        <div className="attendance-meeting-cell">
                          <span className="attendance-primary">{record.meetingDateLabel}</span>
                          <span className="attendance-secondary">{record.meetingTimeLabel}</span>
                        </div>
                      </td>
                      <td className="attendance-cell attendance-value-cell" data-label="Time-in">
                        {record.joinedLabel}
                      </td>
                      <td className="attendance-cell attendance-value-cell" data-label="Time-out">
                        {record.leftLabel}
                      </td>
                      <td className="attendance-cell" data-label="Status">
                        <span className={getStatusClass(record.statusLabel)}>{record.statusLabel}</span>
                      </td>
                      <td className="attendance-cell attendance-action-cell" data-label="Action">
                        {meetingClosed ? (
                          <span className="attendance-action-link is-disabled" aria-disabled="true">
                            {actionLabel}
                          </span>
                        ) : (
                          <Link className="attendance-action-link" href={record.joinPath}>
                            {actionLabel}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="attendance-empty-message">{emptyMessage}</p>
      )}
    </section>
  );
}
