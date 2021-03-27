const TronWeb = require('tronweb');
const schedule = require('node-schedule');
const TelegramBot = require('node-telegram-bot-api');
const csv = require('csv-parser');
const fs = require('fs');

const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider("https://api.trongrid.io");
const solidityNode = new HttpProvider("https://api.trongrid.io");
const eventServer = new HttpProvider("https://api.trongrid.io");

const telegramToken = process.env.telegramToken;
const telegramChatId = process.env.telegramChatId;
const bot = new TelegramBot(telegramToken, {polling: true});
const interval = process.env.interval;

const map = new Map();

var j = null;
var isSchedulerRunning = false;

// All coins from the csv wallets will get send to this Address
const mainWallet = process.env.mainWallet;

// CSV File Path
const csvFilePath = process.env.csvFilePath;

// Start scheduler with telegram bot command /start
bot.onText(/\/start/, (msg) => {
    var datetime = new Date();
    const chatId = telegramChatId;
    var resp = '';
    if (!isSchedulerRunning) {
        schedulerStart();
        resp = 'Service with scheduler started! ' + datetime;
    } else {
        resp = "Service already running!"
    }
    console.log('Telegram Bot: ' + resp)
    bot.sendMessage(chatId, resp);
});

// Stop scheduler with telegram bot command /stop
bot.onText(/\/stop/, (msg) => {
    var datetime = new Date();
    const chatId = telegramChatId;
    var resp = '';
    if (isSchedulerRunning) {
        j.cancel();
        isSchedulerRunning = false;
        resp = 'Service with scheduler stopped! ' + datetime;
    } else {
        resp = "Service already stopped!"
    }
    console.log('Telegram Bot: ' + resp)
    bot.sendMessage(chatId, resp);
});

// Run once through wallet.csv list with telegram bot command /run
bot.onText(/\/run/, (msg) => {
    var datetime = new Date();
    const chatId = telegramChatId;
    var resp = '';
    if (!isSchedulerRunning) {
        init();
        resp = 'Run started! ' + datetime;
    } else {
        resp = "Service in run mode! Command only possible if service is stopped!"
    }
    console.log('Telegram Bot: ' + resp)
    bot.sendMessage(chatId, resp);
});

// Get scheduler status with telegram bot command /status
bot.onText(/\/status/, (msg) => {
    const chatId = telegramChatId;
    var resp = '';
    if (!isSchedulerRunning) {
        resp = 'Service not running!';
    } else {
        resp = "Service running!"
    }
    console.log('Telegram Bot: ' + resp)
    bot.sendMessage(chatId, resp);
});


async function buildTronWeb(wallet) {
    const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, wallet.privateKey);
    return tronWeb;
}

async function getBalance(tronWeb, wallet) {
    const walletBalance = await tronWeb.trx.getUnconfirmedBalance(wallet.address).catch(err => console.error(err));
    return walletBalance;
}

async function sendTrx(tronWeb, wallet, walletBalance) {
    tradeobj = await tronWeb.transactionBuilder.sendTrx(mainWallet, walletBalance, wallet.address, 0).catch(err => console.error(err));
    let signedtxn = null;
    // Check the access permission from the csv wallets and make the sign request
    if (wallet.access === 'multiSign') {
        signedtxn = await tronWeb.trx.multiSign(tradeobj, wallet.privateKey, 2).catch(err => console.error(err));
    } else {
        signedtxn = await tronWeb.trx.sign(tradeobj, wallet.privateKey).catch(err => console.error(err));
    }
    const receipt = await tronWeb.trx.sendRawTransaction(signedtxn).catch(err => console.error(err));
    return receipt;
}

async function init() {
    for (const wallet of map.values()) {
        //console.log(wallet.address + ' - ' + wallet.privateKey);
        const tronWeb = await buildTronWeb(wallet);
        const walletBalance = await getBalance(tronWeb, wallet);
        console.log('Wallet: ' + wallet.address + ' Balance: ' + walletBalance);
        if (walletBalance >= 1100000) {
            const receipt = await sendTrx(tronWeb, wallet, walletBalance);
            if (receipt) {
                console.log('Receipt:', receipt);
                bot.sendMessage(telegramChatId, 'Wallet: ' + wallet.address + '\n Balance: ' + walletBalance / 1000000 + ' TRX \n Receipt: ' + 'https://tronscan.org/#/transaction/' + receipt.txid);
            }
        }
        console.log('-------------------------------------------------------------------------------------------------------');
    }
    var datetime = new Date();
    console.log('-----------------------------' + datetime + '-----------------------------');
}

// Scheduler to trigger every n seconds the process
function schedulerStart() {
    isSchedulerRunning = true;
    j = schedule.scheduleJob(interval, async function () {
        init();
    });
}

// Read wallets from csv to map
fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
        map.set(row.id, row);
    })
    .on('end', () => {
        if (map.size > 0) {
            console.log('CSV file successfully processed!');
            schedulerStart();
        } else {
            console.log('CSV file is empty!')
        }
    });
