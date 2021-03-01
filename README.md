# Tron Wallet Many To One Sender
Send every 30 seconds TRX coins from a list of csv TRON-Wallets to a central TRON-Wallet. Information about transactions (trxid) will be sent via a Telegram-Bot.

# Environment
- telegramToken: Telegram Token from your Bot.
- telegramGroupId: Telegram Group ID to revice messages from your Bot.
- mainWallet: Central Wallet which should revice all TRX Coins from your .csv wallets list.
- csvFilePath: Path to your wallets.csv file. Example in wallets_example.csv file.

Example in docker-compose.yml file.

# DockerHub
Pull image from DockerHub and use the docker-compose.yml file to start the application.
```
$ docker pull stylepatrick/tron_wallet_many_to_one_sender
```

# Deployment
Use the Dockerfile to build the docker image.

```
$ docker build -t tron_wallet_many_to_one_sender:latest .
```

Or use the docker-compose.yml file to deploy the application.
```
$ docker-compose up -d
```

