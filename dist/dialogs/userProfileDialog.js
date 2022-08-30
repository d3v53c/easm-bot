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
exports.UserProfileDialog = void 0;
const botbuilder_dialogs_1 = require("botbuilder-dialogs");
const userProfile_1 = require("../userProfile");
const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
class UserProfileDialog extends botbuilder_dialogs_1.ComponentDialog {
    constructor(userState) {
        super('userProfileDialog');
        this.userProfile = userState.createProperty(USER_PROFILE);
        this.addDialog(new botbuilder_dialogs_1.TextPrompt(NAME_PROMPT));
        this.addDialog(new botbuilder_dialogs_1.ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new botbuilder_dialogs_1.ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new botbuilder_dialogs_1.NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        this.addDialog(new botbuilder_dialogs_1.WaterfallDialog(WATERFALL_DIALOG, [
            this.transportStep.bind(this),
            this.nameStep.bind(this),
            this.nameConfirmStep.bind(this),
            this.ageStep.bind(this),
            this.confirmStep.bind(this),
            this.summaryStep.bind(this)
        ]));
        this.initialDialogId = WATERFALL_DIALOG;
    }
    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    run(turnContext, accessor) {
        return __awaiter(this, void 0, void 0, function* () {
            const dialogSet = new botbuilder_dialogs_1.DialogSet(accessor);
            dialogSet.add(this);
            const dialogContext = yield dialogSet.createContext(turnContext);
            const results = yield dialogContext.continueDialog();
            if (results.status === botbuilder_dialogs_1.DialogTurnStatus.empty) {
                yield dialogContext.beginDialog(this.id);
            }
        });
    }
    transportStep(stepContext) {
        return __awaiter(this, void 0, void 0, function* () {
            // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
            // Running a prompt here means the next WaterfallStep will be run when the users response is received.
            return yield stepContext.prompt(CHOICE_PROMPT, {
                choices: botbuilder_dialogs_1.ChoiceFactory.toChoices(['Car', 'Bus', 'Bicycle']),
                prompt: 'Please enter your mode of transport.'
            });
        });
    }
    nameStep(stepContext) {
        return __awaiter(this, void 0, void 0, function* () {
            stepContext.options.transport = stepContext.result.value;
            return yield stepContext.prompt(NAME_PROMPT, 'What is your name, human?');
        });
    }
    nameConfirmStep(stepContext) {
        return __awaiter(this, void 0, void 0, function* () {
            stepContext.options.name = stepContext.result;
            // We can send messages to the user at any point in the WaterfallStep.
            yield stepContext.context.sendActivity(`Thanks ${stepContext.result}.`);
            // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
            return yield stepContext.prompt(CONFIRM_PROMPT, 'Do you want to give your age?', ['yes', 'no']);
        });
    }
    ageStep(stepContext) {
        return __awaiter(this, void 0, void 0, function* () {
            if (stepContext.result === true) {
                // User said "yes" so we will be prompting for the age.
                // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
                const promptOptions = { prompt: 'Please enter your age.', retryPrompt: 'The value entered must be greater than 0 and less than 150.' };
                return yield stepContext.prompt(NUMBER_PROMPT, promptOptions);
            }
            else {
                // User said "no" so we will skip the next step. Give -1 as the age.
                return yield stepContext.next(-1);
            }
        });
    }
    confirmStep(stepContext) {
        return __awaiter(this, void 0, void 0, function* () {
            stepContext.options.age = stepContext.result;
            const msg = stepContext.options.age === -1 ? 'No age given.' : `I have your age as ${stepContext.options.age}.`;
            // We can send messages to the user at any point in the WaterfallStep.
            yield stepContext.context.sendActivity(msg);
            // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
            return yield stepContext.prompt(CONFIRM_PROMPT, { prompt: 'Is this okay?' });
        });
    }
    summaryStep(stepContext) {
        return __awaiter(this, void 0, void 0, function* () {
            if (stepContext.result) {
                // Get the current profile object from user state.
                const userProfile = yield this.userProfile.get(stepContext.context, new userProfile_1.UserProfile());
                const stepContextOptions = stepContext.options;
                userProfile.transport = stepContextOptions.transport;
                userProfile.name = stepContextOptions.name;
                userProfile.age = stepContextOptions.age;
                let msg = `I have your mode of transport as ${userProfile.transport} and your name as ${userProfile.name}.`;
                if (userProfile.age !== -1) {
                    msg += ` And age as ${userProfile.age}.`;
                }
                yield stepContext.context.sendActivity(msg);
            }
            else {
                yield stepContext.context.sendActivity('Thanks. Your profile will not be kept.');
            }
            // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
            return yield stepContext.endDialog();
        });
    }
    agePromptValidator(promptContext) {
        return __awaiter(this, void 0, void 0, function* () {
            // This condition is our validation rule. You can also change the value at this point.
            return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
        });
    }
}
exports.UserProfileDialog = UserProfileDialog;
//# sourceMappingURL=userProfileDialog.js.map