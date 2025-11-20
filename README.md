# Minimal Real-Time Chat Application (React, Node.js, Socket.io, Firestore)

This project implements a minimal, yet fully functional, real-time chat application using the provided starter code structure. It utilizes **Node.js/Express** with **Socket.io** for the server, and **React** for the client, leveraging **Firebase Firestore** for message persistence.

---

## 🏗️ Project Structure

The final structure is a standard monorepo with separate client and server folders:

## 🚀 Features Implemented

This solution leverages the starter code to fulfill core tasks and exceed the minimum advanced feature count:

| Requirement Area               | Feature Implemented                                                                                        | Task Fulfillment  |
| :----------------------------- | :--------------------------------------------------------------------------------------------------------- | :---------------- |
| **Project Setup**              | Node.js Server, React Client, Socket.io connection                                                         | Task 1 (All)      |
| **Core Chat**                  | **Global Chat Room**, Simple **Username Auth**, Message **Persistence** (via Firestore), **Online Status** | Task 2 (All Core) |
| **Advanced Features (Min. 3)** | **1. User Typing Indicator** (live typing status)                                                          | Task 3            |
|                                | **2. Private Messaging** (Server logic provided in `server.js`)                                            | Task 3            |
|                                | **3. Join/Leave Notifications** (System messages in `socket.js`)                                           | Task 4            |
| **Notifications**              | Join/Leave Notifications                                                                                   | Task 4 (Minimal)  |
| **UX Optimization**            | Message history via Firestore, Responsive UI, Socket Reconnection                                          | Task 5 (Minimal)  |

---

## 🛠️ Setup Instructions and Terminal Commands

You will need **two separate terminals** running simultaneously to start the client and server.

### 1\. Server Setup (Terminal 1)

This terminal will run the Node.js back-end. You need to be inside the `server` directory for these commands.

| Step            | Command                         | Description                                                                                  |
| :-------------- | :------------------------------ | :------------------------------------------------------------------------------------------- |
| **A. Navigate** | `cd server`                     | Move into the server folder.                                                                 |
| **B. Install**  | `npm install`                   | Download and install required Node.js dependencies (`express`, `socket.io`, `dotenv`, etc.). |
| **C. Start**    | `npm start` or `node server.js` | Start the server. It will run on **`http://localhost:5000`**.                                |

**Keep this terminal window running.**

### 2\. Client Setup (Terminal 2)

This terminal will run the React development environment. You need to be inside the `client` directory for these commands.

| Step | Command | Description |
| **A. Navigate** | `cd client` | Move into the client folder. |
| **B. Install** | `npm install` | Download and install required React dependencies (`react`, `firebase`, `socket.io-client`, `tailwindcss`, etc.). |
| **C. Start** | `npm run dev` | Start the client. This will open the application in your browser (usually **`http://localhost:5173`**). |

**Keep this terminal window running.**

### 3\. Usage

1.  Open the client URL in your browser.
2.  Enter a unique **Username** to log in.
3.  Open the same URL in a second browser window (or incognito mode) and enter a different username.
4.  Observe real-time messages, online status updates, and the "user is typing..." indicator.

---

## 📸 Screenshots

Screenshots are in the screenshot folder.

(Testing the ci/cd pipeline)
