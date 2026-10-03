# Connect to Ubuntu from Windows with Remote Desktop

Use GNOME Remote Desktop to manage an Ubuntu control workstation from Windows. This is optional: it does not affect Ansible, K3s, or the ROV deployment.

## Enable Remote Desktop in Ubuntu

1. Open **Settings** and select **System → Remote Desktop**.

   ![Ubuntu Settings](../assets/ubuntu-remote-desktop/01-ubuntu-settings.png)

2. Enable **Desktop Sharing** and **Remote Control**. Set the Remote Desktop username and password.

   ![Remote Desktop in Ubuntu System Settings](../assets/ubuntu-remote-desktop/02.png)

3. Enable **Remote Login** if you need to connect while no local desktop session is active, then set its credentials as well.

   ![Enabling Desktop Sharing and Remote Control](../assets/ubuntu-remote-desktop/03.png)

5. Note the Ubuntu machine's IP address and confirm the Windows computer can reach it:

   ```bash
   ping <ubuntu-ip>
   ```

   ![Configuring Remote Login](../assets/ubuntu-remote-desktop/05.png)

The Ubuntu computer must be powered on and on the same reachable network as the Windows computer.

## Connect from Windows

1. Open **Remote Desktop Connection** (`mstsc`).
2. Enter the Ubuntu host as `<ubuntu-ip>:3390`.

   ![Finding the Ubuntu IP address](../assets/ubuntu-remote-desktop/06.png)


3. Select **Connect** and enter the Remote Desktop credentials configured in Ubuntu.

   ![Entering the Ubuntu host in Remote Desktop Connection](../assets/ubuntu-remote-desktop/07.png)

4. Accept the GNOME Remote Desktop certificate prompt only after confirming the host IP is correct.

   ![Entering Remote Desktop credentials](../assets/ubuntu-remote-desktop/08.png)

## Note: ensure SSH is enabled

Remote Desktop is useful for graphical work; SSH remains the normal transport for Ansible. Enable the SSH server if it is not already installed:

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```

![SSH remote-login settings](../assets/ubuntu-remote-desktop/04.png)

From the control workstation, configure SSH keys for the cluster nodes as described in [Ubuntu workstation setup](ubuntu-workstation-setup.md).
