"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const dotenv_1 = require("dotenv");
const ENV_FILE = path.join(__dirname, '..', '.env');
(0, dotenv_1.config)({ path: ENV_FILE });
const restify = require("restify");
const botbuilder_1 = require("botbuilder");
const bot_1 = require("./bot");
const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${server.name} listening to ${server.url}`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});
const botFrameworkAuthentication = new botbuilder_1.ConfigurationBotFrameworkAuthentication(process.env);
const adapter = new botbuilder_1.CloudAdapter(botFrameworkAuthentication);
const onTurnErrorHandler = (context, error) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(`\n [onTurnError] unhandled error: ${error}`);
    yield context.sendTraceActivity('OnTurnError Trace', `${error}`, 'https://www.botframework.com/schemas/error', 'TurnError');
    yield context.sendActivity('The bot encountered an error or bug.');
    yield context.sendActivity('To continue to run this bot, please fix the bot source code.');
});
adapter.onTurnError = onTurnErrorHandler;
const myBot = new bot_1.EchoBot();
server.post('/api/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield adapter.process(req, res, (context) => myBot.run(context));
}));
server.on('upgrade', (req, socket, head) => __awaiter(void 0, void 0, void 0, function* () {
    const streamingAdapter = new botbuilder_1.CloudAdapter(botFrameworkAuthentication);
    streamingAdapter.onTurnError = onTurnErrorHandler;
    yield streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
}));
