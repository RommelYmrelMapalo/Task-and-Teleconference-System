"use client";

import { useState } from "react";
import type { AdminProfileListItem } from "@/lib/ttcs-data";
import { deleteManagedUserAction } from "@/app/admin/users/actions";
import { AdminUserCreateForm } from "./admin-user-create-form";
import { AdminUserEditForm } from "./admin-user-edit-form";

const ROWS_PER_PAGE = 10;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="m20 20-3.8-3.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m8 9 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15.5V19h14v-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m4 16.5 9.9-9.9 3.5 3.5L7.5 20H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m12.9 7.6 3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 10v7M12 10v7M16 10v7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M6.5 7.5 7.2 19a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PageChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={direction === "left" ? "m14 7-5 5 5 5" : "m10 7 5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages: Array<number | "ellipsis"> = [];

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
    return pages;
  }

  pages.push(1);

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);
  return pages;
}

function buildCsv(users: AdminProfileListItem[]) {
  const rows = [
    ["Full Name", "Email", "Username", "Status", "Role", "Joined Date", "Last Active"],
    ...users.map((user) => [
      user.fullName,
      user.email,
      user.username,
      user.statusLabel,
      user.roleLabel,
      user.joinedLabel,
      user.lastActiveLabel,
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

export function AdminUserManagement({ users }: { users: AdminProfileListItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateOrder, setDateOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminProfileListItem | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  let filteredUsers = users.filter((user) => {
    const matchesSearch =
      !normalizedQuery ||
      `${user.fullName} ${user.email} ${user.username}`.toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.statusTone === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  filteredUsers = filteredUsers.sort((left, right) => {
    const leftValue = new Date(left.createdAt).getTime();
    const rightValue = new Date(right.createdAt).getTime();
    return dateOrder === "newest" ? rightValue - leftValue : leftValue - rightValue;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
  const visiblePages = getVisiblePages(safePage, totalPages);

  async function handleExport() {
    const csv = buildCsv(filteredUsers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ttcs-users.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="manage-users-layout">
      <section className="manage-users-panel">
        <div className="manage-users-toolbar">
          <label className="manage-users-search">
            <span className="manage-users-search-icon">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search"
              aria-label="Search users"
            />
          </label>

          <div className="manage-users-filters">
            <label className="manage-users-filter">
              <span>Role</span>
              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by role"
              >
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              <span className="manage-users-filter-caret">
                <ChevronIcon />
              </span>
            </label>
            <label className="manage-users-filter">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="deactivated">Deactivated</option>
              </select>
              <span className="manage-users-filter-caret">
                <ChevronIcon />
              </span>
            </label>
            <label className="manage-users-filter">
              <span>Date</span>
              <select
                value={dateOrder}
                onChange={(event) => {
                  setDateOrder(event.target.value as "newest" | "oldest");
                  setCurrentPage(1);
                }}
                aria-label="Sort by date"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <span className="manage-users-filter-caret">
                <ChevronIcon />
              </span>
            </label>
          </div>

          <div className="manage-users-toolbar-actions">
            <button type="button" className="manage-users-toolbar-button" onClick={handleExport}>
              <DownloadIcon />
              <span>Export</span>
            </button>
            <button
              type="button"
              className="manage-users-toolbar-button manage-users-toolbar-button-primary"
              onClick={() => setAddUserOpen(true)}
            >
              <PlusIcon />
              <span>Add User</span>
            </button>
          </div>
        </div>

        <div className="manage-users-table-wrap">
          <table className="manage-users-table">
            <thead>
              <tr>
                <th className="manage-users-checkbox-col">
                  <input type="checkbox" aria-label="Select all users" disabled />
                </th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined Date</th>
                <th>Last Active</th>
                <th className="manage-users-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.length ? (
                pagedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="manage-users-checkbox-col">
                      <input type="checkbox" aria-label={`Select ${user.fullName}`} disabled />
                    </td>
                    <td>
                      <div className="manage-users-name-cell">
                        <div className="manage-users-avatar">{user.initials}</div>
                        <div className="manage-users-name-text">{user.fullName}</div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td>
                      <span className={`manage-users-status manage-users-status-${user.statusTone}`}>
                        {user.statusLabel}
                      </span>
                    </td>
                    <td>{user.roleLabel}</td>
                    <td>{user.joinedLabel}</td>
                    <td>{user.lastActiveLabel}</td>
                    <td className="manage-users-actions-col">
                      <div className="manage-users-row-actions">
                        <button
                          type="button"
                          className="manage-users-icon-button"
                          onClick={() => setEditingUser(user)}
                          title={`Edit ${user.fullName}`}
                          aria-label={`Edit ${user.fullName}`}
                        >
                          <PencilIcon />
                        </button>
                        <form
                          action={deleteManagedUserAction}
                          onSubmit={(event) => {
                            if (!window.confirm(`Delete ${user.fullName}? This cannot be undone.`)) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            className="manage-users-icon-button manage-users-icon-button-danger"
                            title={`Delete ${user.fullName}`}
                            aria-label={`Delete ${user.fullName}`}
                          >
                            <TrashIcon />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="manage-users-empty" colSpan={9}>
                    No users match the current search and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="manage-users-footer">
          <div className="manage-users-count">
            Rows per page <span>{ROWS_PER_PAGE}</span> of {filteredUsers.length} rows
          </div>
          <div className="manage-users-pagination">
            <button
              type="button"
              className="manage-users-page-button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <PageChevronIcon direction="left" />
            </button>
            {visiblePages.map((page, index) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="manage-users-page-ellipsis">
                  ...
                </span>
              ) : (
                <button
                  type="button"
                  key={page}
                  className={`manage-users-page-button${page === safePage ? " is-active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ),
            )}
            <button
              type="button"
              className="manage-users-page-button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <PageChevronIcon direction="right" />
            </button>
          </div>
        </div>
      </section>

      {addUserOpen ? (
        <div className="modal-overlay show" onClick={() => setAddUserOpen(false)}>
          <div className="modal-popup modern-popup task-edit-modal manage-users-task-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manage-users-modal-head">
              <div className="modal-text">Add User</div>
              <button
                type="button"
                className="manage-users-modal-close"
                onClick={() => setAddUserOpen(false)}
                aria-label="Close add user dialog"
              >
                x
              </button>
            </div>
            <AdminUserCreateForm className="manage-users-modal-form" onCancel={() => setAddUserOpen(false)} />
          </div>
        </div>
      ) : null}

      {editingUser ? (
        <div className="modal-overlay show" onClick={() => setEditingUser(null)}>
          <div className="modal-popup modern-popup task-edit-modal manage-users-task-modal" onClick={(event) => event.stopPropagation()}>
            <div className="manage-users-modal-head">
              <div className="modal-text">Edit User</div>
              <button
                type="button"
                className="manage-users-modal-close"
                onClick={() => setEditingUser(null)}
                aria-label="Close edit user dialog"
              >
                x
              </button>
            </div>
            <AdminUserEditForm
              user={editingUser}
              onCancel={() => setEditingUser(null)}
              onSuccess={() => setEditingUser(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
