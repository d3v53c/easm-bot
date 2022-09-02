// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { TimexProperty } from '@microsoft/recognizers-text-data-types-timex-expression';
import { RequestContext } from './context';

import { InputHints, MessageFactory, StatePropertyAccessor, TurnContext } from 'botbuilder';
import { LuisRecognizer } from 'botbuilder-ai';

import {
    ComponentDialog,
    DialogSet,
    DialogState,
    DialogTurnResult,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog,
    WaterfallStepContext
} from 'botbuilder-dialogs';
import { AccessRequestDialog } from './access';
import { Recognizer } from './recognizer';
import { RequestType } from '../enums';
const moment = require('moment');

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';
const TEXT_PROMPT = 'TextPrompt';

export class MainDialog extends ComponentDialog {
    private luisRecognizer: Recognizer;

    constructor(luisRecognizer: Recognizer, accessRequestDialog: AccessRequestDialog) {
        super('MainDialog');

        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;

        if (!accessRequestDialog) throw new Error('[MainDialog]: Missing parameter \'accessRequestDialog\' is required');

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        this
            .addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(accessRequestDialog)
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.introStep.bind(this),
                this.actStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a DialogContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {TurnContext} context
     */
    public async run(context: TurnContext, accessor: StatePropertyAccessor<DialogState>) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(context);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    /**
     * First step in the waterfall dialog. Prompts the user for a command.
     * Currently, this expects a booking request, like "book me a flight from Paris to Berlin on march 22"
     * Note that the sample LUIS model will only recognize Paris, Berlin, New York and London as airport cities.
     */
    private async introStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        if (!this.luisRecognizer.isConfigured) {
            const luisConfigMsg = 'NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.';
            await stepContext.context.sendActivity(luisConfigMsg, null, InputHints.IgnoringInput);
            return await stepContext.next();
        }
        const messageText = (stepContext.options as any).restartMsg ?
            (stepContext.options as any).restartMsg :
            `What can I help you with today?`;
        const promptMessage = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await stepContext.prompt(TEXT_PROMPT, { prompt: promptMessage });
    }

    /**
     * Second step in the waterall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
     * Then, it hands off to the accessRequestDialog child dialog to collect any remaining details.
     */
    private async actStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const context = new RequestContext();

        if (!this.luisRecognizer.isConfigured) {
            // LUIS is not configured, we just run the AccessRequestDialog path.
            return await stepContext.beginDialog('accessRequestDialog', context);
        }

        if (!stepContext.context.activity.text) {
            return await stepContext.prompt(TEXT_PROMPT, { prompt: 'What can I help you with today?' });
        }


        // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
        const topIntent = LuisRecognizer.topIntent(luisResult);
        const entities = luisResult.entities;

        context.request_type = topIntent;
        if (entities.cust_project_id && entities.cust_project_id.length > 0) {
            context.cust_project_id = entities.cust_project_id[0];
        }

        switch (LuisRecognizer.topIntent(luisResult)) {
            case RequestType.ACCESS_REPORT:
                return await stepContext.beginDialog('accessRequestDialog', context);

            case RequestType.ACCESS_TRACKER:
                return await stepContext.beginDialog('accessRequestDialog', context);

            case RequestType.REPORT_STATUS:
                return await stepContext.beginDialog('accessRequestDialog', context);

            case RequestType.TRACKER_STATUS:
                return await stepContext.beginDialog('accessRequestDialog', context);

            case RequestType.REQUEST_REVALIDATION:
                return await stepContext.beginDialog('accessRequestDialog', context);

            default:
                // Catch all for unhandled intents
                const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${LuisRecognizer.topIntent(luisResult)})`;
                await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
        }

        return await stepContext.next();
    }

    /**
     * This is the final step in the main waterfall dialog.
     * It wraps up the sample "book a flight" interaction with a simple confirmation.
     */
    private async finalStep(stepContext: WaterfallStepContext) {
        const context = stepContext.context;
        // If the child dialog ("accessRequestDialog") was cancelled or the user failed to confirm, the Result here will be null.
        if (stepContext.result) {
            const result = stepContext.result as RequestContext;
            // Now we have all the booking details.

            // This is where calls to the booking AOU service or database would go.

            // If the call to the booking service was successful tell the user.
            const msg = `Dear User, your service request for revalidation of the security assessment project has been received and is being 
            processed. You will be notified via email once the process is complete. You can also monitor the status of the process 
            at the Project Details Dashboard. Thank you for your patience.`;

            await stepContext.context.sendActivity(msg);
        }


        // Restart the main dialog waterfall with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, {
            restartMsg: 'What else can I do for you?',
        });
    }
}
