# Aternos AFK Bot

A simple, robust AFK bot designed to keep Aternos Minecraft Bedrock servers online. It supports both automatic movement and randomization to avoid AFK detection.

## Features

- **Anti-AFK**: Randomly rotates, looks around, sneaks, and swings arm.
- **Auto-Connect**: Automatically resolves Aternos dynamic IPs.
- **Auto-Reconnect**: Retries connection if kicked or if the server is offline.
- **Cross-Platform**: Runs on Windows, Linux, and Android (via Termux).

## System Requirements

- Node.js (Version 16 or higher recommended).

---

## Installation & Usage

### 🖥️ Windows / PC

1.  **Install Node.js**

    - Download and install from [nodejs.org](https://nodejs.org/).

2.  **Download the Bot**

    - Download this folder to your computer.

3.  **Install Dependencies**

    - Open a terminal (Command Prompt or PowerShell) in the folder.
    - Run:
      ```bash
      npm install
      ```

4.  **Configure**

    - Open `bot.js` in a text editor (like Notepad).
    - Edit the `config` section at the top with your Aternos address:
      ```javascript
      const config = {
        host: "your-server.aternos.me",
        port: 12345, // Port from the "Connect" button
        username: "AFK_Bot",
        offline: true, // Set to false if you need Microsoft Auth
      };
      ```

5.  **Run**
    ```bash
    node bot.js
    ```

---

### 📱 Android (Termux)

1.  **Install Termux**

    - Download **Termux** from F-Droid (avoid the Play Store version as it is outdated).

2.  **Setup Environment**

    - Open Termux and run the following commands one by one to install Node.js and necessary build tools:
      ```bash
      pkg update && pkg upgrade
      pkg install nodejs python make clang git
      ```

3.  **Get the Bot Code**

    - You can transfer the files from your PC to your phone, or use `git` if you have the code on GitHub.

4.  **Install Dependencies**

    - Navigate to the bot folder:
      ```bash
      cd path/to/afk-bot
      ```
    - Install the packages (this may take a few minutes):
      ```bash
      npm install
      ```

5.  **Run**
    ```bash
    node bot.js
    ```
    _Note: If using Microsoft Auth (`offline: false`), Termux will show a link. Copy and paste it into your browser to authenticate._

---

## Commands

Type these in the terminal while the bot is running:

- `!start` - Enable Anti-AFK movement (Default).
- `!stop` - Disable movement (Bot stands still).
