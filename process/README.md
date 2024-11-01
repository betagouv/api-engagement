# Process

This folder is implementing all the crons job that API Engagement is need to be updated and offer its best functionnality. The process script is launch on the instance store on Scaleway. The instance is already prepared: all the command in the Instance's configuration section has been made already

## Create SSH Key

The steps to create your ssh key are fully described here https://www.scaleway.com/en/docs/console/project/how-to/create-ssh-key/.

```bash
ssh-keygen -t ed25519 -C "my-login" -Z aes256-gcm@openssh.com
...
# (respond to the questions, let's say you choose the key file name to ~/.ssh/my_ssh_key)
...
cat ~/.ssh/my_ssh_key.pub

```

## Connection

The steps to connect to the instance are fully described here https://www.scaleway.com/en/docs/compute/instances/how-to/connect-to-instance/. To connect to the instance, an ssh key is need to be configure using the Scaleway console. By the end of the configuration, let's say we stored our key in the ~/.ssh/my_ssh_key file.

```bash
ssh -i ~/.ssh/my_ssh_key root@process_instance_ip
```

Copy the content displayed which looks like this `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINPZxtCMs5sIfsMWpq7SHuqFFpBtSTmFqXWOYdf6dX4i my-login` and stored it to the Scaleway console. IMPORTANT, if the instance you want to connect to is already running, you need to reboot the instance so the new ssh keys can be connected.

## Instance configuration (to do once)

Update of apt version

```bash
apt update
apt upgrade
```

### Install NodeJs 20 and pm2

Install curl to download the setup installer of node then install NodeJS 20

```bash
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install nodejs
node --version
v20.11.0
```

Install PM2

```bash
npm i -g pm2
```

### Install Git

Install git in order to pull the update of the repo

```bash
apt install -y git-all
```

### Cloning the repo

Clone the repo in local (the cloning needed using an ssh key connection https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories#cloning-with-https-urls)

```bash
git clone git@github.com:selego/apicivique.git
```

### Setting environment variables

```bash
cd apivicivique/process
nano .env
(adding environmment variables)
```

### Start the process

Once all the configuration on top have been made, let's start the process

```bash
cd apivicivique/process
pm2 start index.js --name process
```

## Update the process

All the command to update the process are included in the workflows `restart-process` that connect to ssh and excecute this command

```bash
cd apicivique/process
git pull
npm install
pm2 restart process
```
