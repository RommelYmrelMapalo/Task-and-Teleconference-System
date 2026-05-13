# TTCS User Manual

Task and Teleconference System

Version 1.1

Prepared from the current TTCS application build on May 13, 2026

## Table of Contents

1. Introduction
1.1 What is TTCS
1.2 Importance of TTCS
2. System Requirements
2.1 Hardware Requirements
2.2 Software Requirements
2.3 Network Requirements
3. Accessing the TTCS
3.1 Logging In
3.2 Forgot Password Procedure
4. Admin User Guide
4.1 Admin Dashboard Overview
4.2 Adding New Users
4.3 Managing Users
4.4 Managing Tasks
4.5 Managing Meetings
4.6 Monitoring Panel and Admin Inbox
5. Standard User Guide
5.1 User Dashboard Overview
5.2 Managing Personal Tasks
5.3 Meetings, Attendance, Inbox, and Profile
6. Best Practices
7. Troubleshooting Guide
8. Appendices
8.1 Glossary of Terms
8.2 Frequently Asked Questions (FAQs)

## 1. Introduction

TTCS, short for Task and Teleconference System, is a web-based platform designed to combine task coordination, meeting management, attendance tracking, and internal communication in one system. Instead of switching between separate applications for assignments, meetings, and updates, TTCS allows users and administrators to work inside one shared environment.

The current TTCS build includes separate user and admin workspaces. Each workspace has a sidebar-based navigation layout and gives access to tools that match the account role.

### 1.1 What is TTCS

TTCS is a centralized system for:

- Creating and managing tasks
- Assigning work to users
- Tracking task progress and revision status
- Scheduling teleconference meetings
- Opening meeting rooms through TTCS
- Recording meeting attendance automatically
- Sending and receiving internal inbox messages
- Managing user accounts and monitoring system activity

### 1.2 Importance of TTCS

TTCS is important because it keeps operational work in one place. In the current implementation, it helps organizations:

- Reduce scattered communication by keeping task and meeting messages inside the TTCS inbox
- Improve accountability through task status tracking and assignment records
- Monitor participation through automatic meeting time-in and time-out logging
- Support administrators with user management and system event monitoring
- Preserve historical records through task archiving and inbox trash retention

## 2. System Requirements

TTCS is a browser-based system built on Next.js and Supabase-backed services. The requirements below are practical recommendations for normal use.

### 2.1 Hardware Requirements

Recommended minimum hardware for end users:

- Desktop or laptop computer
- Modern mobile device for basic access
- At least 4 GB RAM for regular browser use
- Working microphone, speakers, or headset for meetings
- Webcam if video participation is required

Recommended minimum hardware for administrators:

- Desktop or laptop computer
- At least 8 GB RAM for smoother multitasking
- Keyboard and mouse for easier record management
- Audio devices for teleconference use when needed

### 2.2 Software Requirements

TTCS currently requires:

- A modern web browser
- JavaScript enabled in the browser
- Internet access to reach the application and Supabase-backed services

Browsers should be updated versions of common modern browsers that can run current web applications reliably.

### 2.3 Network Requirements

TTCS depends on stable network access for authentication, task updates, message loading, and meeting participation.

Recommended network conditions:

- Stable internet connection
- Reliable access to the TTCS deployment URL
- Sufficient bandwidth for teleconference participation
- Network access that does not block embedded meeting sessions

For meetings, stronger and more stable connectivity is recommended than for normal browsing.

## 3. Accessing the TTCS

TTCS provides separate login entry points for regular users and administrators.

### 3.1 Logging In

For regular users:

1. Open the TTCS user login page.
2. Enter the registered email address.
3. Enter the password.
4. Select `Login`.
5. After successful authentication, the account is redirected to the user dashboard.

For administrators:

1. Open the TTCS admin login page.
2. Enter the admin email address.
3. Enter the password.
4. Select `Login as Admin`.
5. After successful authentication, the account is redirected to the admin dashboard.

Important current access rules:

- User accounts must use the standard user login page.
- Admin accounts must use the admin login page.
- Deactivated accounts cannot sign in.

### 3.2 Forgot Password Procedure

The current TTCS build does not expose a dedicated `Forgot Password` screen in the visible user interface.

At present, recovery should be handled through one of the following:

- Administrator assistance for managed accounts
- Supabase-authenticated recovery workflow if configured in deployment
- Password change from the `Profile` page when the user is still able to sign in

If a user can still access the account, the password can be changed from the profile section by entering:

- Current password
- New password
- Confirmation password

## 4. Admin User Guide

The admin workspace provides system-wide controls for tasks, meetings, users, inbox communication, and monitoring.

The current admin sidebar modules are:

- `Dashboard`
- `Manage Tasks`
- `Task Status`
- `Task Archive`
- `Manage Meetings`
- `Meeting Attendance`
- `Monitoring Panel`
- `Manage Users`
- `Inbox`

### 4.1 Admin Dashboard Overview

The `Admin Dashboard` is the main landing page for administrator accounts. It provides an overview of:

- Current task workload
- Pending, completed, and delayed task counts
- Meeting schedule visibility
- Calendar-based planning support

Administrators should begin here when checking the overall status of the system.

### 4.2 Adding New Users

New accounts can be created from the `Manage Users` page.

To add a user:

1. Open `Manage Users`.
2. Select `Add User`.
3. Enter the full name.
4. Enter the email address.
5. Choose the role: `User` or `Admin`.
6. Submit the form.

Current account creation behavior:

- TTCS generates a temporary password automatically
- The temporary password is shown after successful creation
- The password should be shared securely with the new user

### 4.3 Managing Users

The `Manage Users` page allows administrators to maintain account records across the system.

Available user management features:

- Search by full name, email, or username
- Filter by role
- Filter by status
- Sort by joined date
- Export user records to CSV
- Edit user details
- Deactivate or reactivate accounts
- Delete accounts

Current editable properties include:

- Full name
- Role

Current read-only display values include:

- Email
- Joined date
- Last active
- Current status

### 4.4 Managing Tasks

The `Manage Tasks` page gives administrators broad control over task records.

Admins can:

- Create new tasks
- Set title, description, due date, due time, status, and priority
- Assign tasks to one or more users
- Leave a task unassigned when appropriate
- Upload attachments
- Edit visible tasks
- Open task details
- Review task comments and activity
- Approve or reject tasks with a reason

Current task statuses visible in TTCS:

- `Assigned`
- `In Progress`
- `For Revision`
- `Completed`

Important review behavior:

- Admin approval records a review note with the reason
- Admin rejection records a review note and returns the task to `For Revision`
- Delayed tasks are visually flagged when overdue and unfinished
- Archived tasks are read-only

Other task-related sidebar modules for admins:

- `Task Status` provides a cross-user overview of task progress, assignees, assigned by, and deadlines
- `Task Archive` shows archived task records retained after inactivity for historical review

### 4.5 Managing Meetings

The `Manage Meetings` page allows administrators to schedule meetings and assign participants.

Meeting creation fields currently include:

- Title
- Date
- Start time
- End time
- Description
- Participant roles
- Individual participant accounts

Participant assignment behavior:

- Admins may assign by role
- Admins may assign individual users directly
- Role-based and direct selections are merged automatically
- Meeting notices are sent to participant inboxes
- Assigned meetings become visible in relevant user meeting pages

The admin `Meeting Attendance` sidebar module is used to:

- Review attendance records
- See time-in and time-out values
- Check meeting status such as `Pending`, `In Call`, `Completed`, `Closed`, or `Missed`
- Open meeting rooms while the schedule is still active

### 4.6 Monitoring Panel and Admin Inbox

The `Monitoring Panel` and `Inbox` support administrative follow-up and communication.

Monitoring Panel capabilities:

- View system events
- Filter events by category
- Review account, login, notification, and task audit activity
- Export filtered system events to CSV

Admin Inbox capabilities:

- Read task and meeting conversations
- Reply to users inside TTCS
- Compose direct messages
- Review trashed threads
- Restore threads before permanent deletion

The `Manage Users` sidebar module supports:

- Adding new user and admin accounts
- Editing user names and roles
- Deactivating or reactivating accounts
- Deleting accounts
- Searching, filtering, and exporting account records

## 5. Standard User Guide

The user workspace is intended for everyday task work, meetings, attendance, inbox communication, and account maintenance.

The current user sidebar modules are:

- `Dashboard`
- `Tasks Dashboard`
- `Task Status`
- `Task Archive`
- `Manage Meetings`
- `Assigned Meetings`
- `Meeting Attendance`
- `Inbox`

### 5.1 User Dashboard Overview

The `Dashboard` is the starting page for regular users.

It provides:

- Overview of visible tasks
- Meeting updates
- Current planning context
- Quick awareness of workload and upcoming activity

Users should visit the dashboard first after logging in to review what needs attention.

### 5.2 Managing Personal Tasks

The `Tasks Dashboard`, `Task Status`, and `Task Archive` pages make up the main task workflow for users.

Inside `Tasks Dashboard`, users can:

- View visible tasks
- Search by title or description
- Filter by task status
- Filter by priority
- Open task records
- Edit tasks when permitted
- Mark a task complete or restore it to a previous status
- Create tasks
- Add or remove attachments before submission

Task-related pages available to users:

- `Tasks Dashboard`
- `Task Status`
- `Task Archive`

Archive behavior in the current build:

- Tasks are archived after 31 days of inactivity
- Archived task records remain visible in the archive page
- Archived tasks are read-only

### 5.3 Meetings, Attendance, Inbox, and Profile

Users can manage communication and participation through the remaining user modules.

`Manage Meetings`:

- Create meetings from the user workspace
- Set title, date, start time, end time, and description
- Assign participants by role or by individual account
- Send meeting notices into the TTCS inbox

`Assigned Meetings`:

- View meetings assigned to the current account
- Review date, time, and description
- Open the meeting room while it is still active

`Meeting Attendance`:

- Review attendance records
- See meeting date and time
- See time-in and time-out
- Check attendance status such as `Pending`, `In Call`, `Completed`, `Closed`, or `Missed`

`Inbox`:

- Search conversations
- Filter by `All`, `Task`, `Meeting`, `Chat`, and `Trash`
- Open a thread to read full message history
- Compose a new message
- Reply to admins or other contacts when allowed
- Forward direct conversations
- Move threads to trash
- Restore trashed threads

Trash behavior:

- Deleted conversations move to trash first
- Trashed conversations are permanently deleted after 31 days

`Profile`:

- Update profile name
- Update email address
- Change password

## 6. Best Practices

The following practices help keep TTCS records accurate and useful:

- Update task status as work changes
- Write clear task descriptions and deadlines
- Use attachments when task context depends on files
- Use the TTCS inbox instead of outside channels when a task already has an existing thread
- Open meetings through TTCS so attendance is recorded properly
- Share temporary passwords securely when creating accounts manually
- Review archived tasks instead of recreating historical records

## 7. Troubleshooting Guide

### Login Problems

If login fails:

- Confirm that the correct login page is being used
- Verify the email and password
- Check whether the account has been deactivated
- Check whether the account still needs email confirmation

### Task Problems

If a task cannot be edited:

- Check whether the task is archived
- Check whether the account has the needed permissions
- Confirm that the record still exists and is visible to the current user

### Meeting Problems

If a meeting room does not open:

- Check whether the meeting is assigned to the current account
- Check whether the meeting schedule has already closed
- Open the meeting through TTCS rather than an outside shortcut

### Inbox Problems

If a conversation appears missing:

- Search the inbox
- Check the `Trash` filter
- Restore the thread before the 31-day retention period ends

### Profile Problems

If email changes do not appear immediately:

- Check whether email confirmation is still pending
- Refresh the session after confirmation

## 8. Appendices

### 8.1 Glossary of Terms

`TTCS`
: Task and Teleconference System.

`Task Archive`
: The read-only view of task records retained after inactivity.

`Assigned Meetings`
: The page that shows meetings scheduled for the current user.

`Meeting Attendance`
: The attendance log that records room join and exit times when the meeting is opened through TTCS.

`Monitoring Panel`
: The admin page used to review system events and export logs.

`Inbox Thread`
: A conversation record containing one or more TTCS messages.

### 8.2 Frequently Asked Questions (FAQs)

`Can regular users create tasks?`

Yes. In the current build, regular users can create tasks from the task dashboard.

`Can admins assign one task to multiple users?`

Yes. The admin task form supports multiple assignees.

`How is attendance recorded?`

Attendance is recorded automatically when the meeting room is opened and exited through TTCS.

`Can deleted inbox conversations still be recovered?`

Yes. A deleted conversation can be restored from trash before the 31-day deletion period ends.

`Does TTCS currently have a visible forgot-password page?`

No. The current visible interface does not expose a dedicated forgot-password page.

## Document Note

This manual follows the structure requested in the provided table of contents while staying aligned with the TTCS features currently implemented in the repository.
