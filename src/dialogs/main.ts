// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { TimexProperty } from '@microsoft/recognizers-text-data-types-timex-expression';
import { BookingDetails } from './context';

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
        const bookingDetails = new BookingDetails();

        if (!this.luisRecognizer.isConfigured) {
            // LUIS is not configured, we just run the AccessRequestDialog path.
            return await stepContext.beginDialog('accessRequestDialog', bookingDetails);
        }

        // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
        const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
        console.log(luisResult.luisResult.predictions, "actStep");
        console.log(LuisRecognizer.topIntent(luisResult), "LuisRecognizer.topIntent(luisResult)");
        switch (LuisRecognizer.topIntent(luisResult)) {
            // case 'BookFlight':
            //     // Extract the values for the composite entities from the LUIS result.
            //     const fromEntities = this.luisRecognizer./.bc/.,/getFromEntities(luisResult);
            //     const toEntities = this.luisRecognizer.getToEntities(luisResult);

            //     // Show a warning for Origin and Destination if we can't resolve them.
            //     await this.showWarningForUnsupportedCities(stepContext.context, fromEntities, toEntities);

            //     // Initialize BookingDetails with any entities we may have found in the response.
            //     bookingDetails.destination = toEntities.airport;
            //     bookingDetails.origin = fromEntities.airport;
            //     bookingDetails.travelDate = this.luisRecognizer.getTravelDate(luisResult);
            //     console.log('LUIS extracted these booking details:', JSON.stringify(bookingDetails));

            //     // Run the AccessRequestDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
            //     return await stepContext.beginDialog('accessRequestDialog',  bookingDetails);

            // case 'GetWeather':
            //     // We haven't implemented the GetWeatherDialog so we just display a TODO message.
            //     const getWeatherMessageText = 'TODO: get weather flow here';
            //     await stepContext.context.sendActivity(getWeatherMessageText, getWeatherMessageText, InputHints.IgnoringInput);
            //     break;

            default:
                // Catch all for unhandled intents
                const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${LuisRecognizer.topIntent(luisResult)})`;
                await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
        }

        return await stepContext.next();
    }

    /**
     * Shows a warning if the requested From or To cities are recognized as entities but they are not in the Airport entity list.
     * In some cases LUIS will recognize the From and To composite entities as a valid cities but the From and To Airport values
     * will be empty if those entity values can't be mapped to a canonical item in the Airport.
     */
    private async showWarningForUnsupportedCities(context, fromEntities, toEntities) {
        const unsupportedCities = [];
        if (fromEntities.from && !fromEntities.airport) {
            unsupportedCities.push(fromEntities.from);
        }

        if (toEntities.to && !toEntities.airport) {
            unsupportedCities.push(toEntities.to);
        }

        if (unsupportedCities.length) {
            const messageText = `Sorry but the following airports are not supported: ${unsupportedCities.join(', ')}`;
            await context.sendActivity(messageText, messageText, InputHints.IgnoringInput);
        }
    }

    /**
     * This is the final step in the main waterfall dialog.
     * It wraps up the sample "book a flight" interaction with a simple confirmation.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const context = stepContext.context;
        // If the child dialog ("accessRequestDialog") was cancelled or the user failed to confirm, the Result here will be null.
        if (stepContext.result) {
            const result = stepContext.result as BookingDetails;
            console.log({ result }, "finalStep")
            // Now we have all the booking details.

            // This is where calls to the booking AOU service or database would go.

            // If the call to the booking service was successful tell the user.
            const msg = `Dear User, your service request for revalidation of the security assessment project has been received and is being 
            processed. You will be notified via email once the process is complete. You can also monitor the status of the process 
            at the Project Details Dashboard. Thank you for your patience.`;
            await stepContext.context.sendActivity(msg);
        }

        console.log("finalStep", stepContext.result);

        // Restart the main dialog waterfall with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, {
            ...context,
            restartMsg: 'What else can I do for you?',
        });
    }
}
