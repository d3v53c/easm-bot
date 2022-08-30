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
exports.ConsoleAdapter = void 0;
const botbuilder_core_1 = require("botbuilder-core");
const readline = require("readline");
class ConsoleAdapter extends botbuilder_core_1.BotAdapter {
    constructor(reference) {
        super();
        this.nextId = 0;
        this.reference = Object.assign({ bot: { id: 'bot', name: 'Bot' }, channelId: 'console', conversation: { id: 'convo1', name: '', isGroup: false }, serviceUrl: '', user: { id: 'user', name: 'User1' } }, reference);
    }
    listen(logic) {
        const rl = this.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
        rl.on('line', (line) => {
            const activity = botbuilder_core_1.TurnContext.applyConversationReference({
                id: (this.nextId++).toString(),
                text: line,
                timestamp: new Date(),
                type: botbuilder_core_1.ActivityTypes.Message
            }, this.reference, true);
            const context = new botbuilder_core_1.TurnContext(this, activity);
            this.runMiddleware(context, logic)
                .catch((err) => { this.printError(err.toString()); });
        });
        return () => {
            rl.close();
        };
    }
    continueConversation(reference, logic) {
        const activity = botbuilder_core_1.TurnContext.applyConversationReference({}, reference, true);
        const context = new botbuilder_core_1.TurnContext(this, activity);
        return this.runMiddleware(context, logic)
            .catch((err) => { this.printError(err.toString()); });
    }
    sendActivities(context, activities) {
        return __awaiter(this, void 0, void 0, function* () {
            const responses = [];
            for (const activity of activities) {
                responses.push({});
                switch (activity.type) {
                    case 'delay':
                        yield this.sleep(activity.value);
                        break;
                    case botbuilder_core_1.ActivityTypes.Message:
                        if (activity.attachments && activity.attachments.length > 0) {
                            const append = activity.attachments.length === 1
                                ? `(1 attachment)` : `(${activity.attachments.length} attachments)`;
                            this.print(`${activity.text} ${append}`);
                        }
                        else {
                            this.print(activity.text || '');
                        }
                        break;
                    default:
                        this.print(`[${activity.type}]`);
                        break;
                }
            }
            return responses;
        });
    }
    updateActivity(context, activity) {
        return Promise.reject(new Error(`ConsoleAdapter.updateActivity(): not supported.`));
    }
    deleteActivity(context, reference) {
        return Promise.reject(new Error(`ConsoleAdapter.deleteActivity(): not supported.`));
    }
    createInterface(options) {
        return readline.createInterface(options);
    }
    print(line) {
        console.log(line);
    }
    printError(line) {
        console.error(line);
    }
    sleep(milliseconds) {
        return new Promise(resolve => {
            setTimeout(resolve, milliseconds);
        });
    }
}
exports.ConsoleAdapter = ConsoleAdapter;
