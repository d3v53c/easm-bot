// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TimexProperty } from '@microsoft/recognizers-text-data-types-timex-expression';
import { InputHints, MessageFactory } from 'botbuilder';
import {
    ChoiceFactory,
    ChoicePrompt,
    ConfirmPrompt,
    DialogTurnResult,
    TextPrompt,
    WaterfallDialog,
    WaterfallStepContext
} from 'botbuilder-dialogs';
import { RequestContext } from './context';
import { CancelAndHelpDialog } from './cancel';
import { RequestType } from '../enums';

const CONFIRM_PROMPT = 'confirmPrompt';
const DATE_RESOLVER_DIALOG = 'dateResolverDialog';
const TEXT_PROMPT = 'textPrompt';
const CHOICE_PROMPT = 'choicePrompt';
const WATERFALL_DIALOG = 'waterfallDialog';

export class AccessRequestDialog extends CancelAndHelpDialog {
    constructor(id: string) {
        super(id || 'bookingDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.customerProjectIDStep.bind(this),
                this.requestTypeStep.bind(this),
                this.parseRequestTypeStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * If a destination city has not been provided, prompt for one.
     */
    private async customerProjectIDStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const context = stepContext.options as RequestContext;

        if (!context.cust_project_id) {
            const messageText = 'Enter Project ID :';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        } else {
            return await stepContext.next(context.cust_project_id);
        }
    }

    /**
     * If an origin city has not been provided, prompt for one.
     */
    private async requestTypeStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const context = stepContext.options as RequestContext;
        console.log('MainDialog.requestTypeStep', stepContext.result);

        // Capture the response to the previous step's prompt
        context.cust_project_id = stepContext.result;
        if (!context.request_type) {
            const options = {
                choices: this.getChoices(),
                prompt: 'Please enter your type of request.',
            };
            return await stepContext.prompt(CHOICE_PROMPT, options);
        } else {
            return await stepContext.next(context.request_type);
        }
    }

    /**
     * If a travel date has not been provided, prompt for one.
     * This will use the DATE_RESOLVER_DIALOG.
     */
    public async parseRequestTypeStep(stepContext: WaterfallStepContext) {
        const context = stepContext.options as RequestContext;
        console.log('MainDialog.parseRequestTypeStep', stepContext.result);

        switch (stepContext.result) {
            case RequestType.ACCESS_TRACKER:
                await stepContext.context.sendActivity('Testing ACCESS_TRACKER');
                break;
            case RequestType.ACCESS_REPORT:
                await stepContext.context.sendActivity('Testing ACCESS_REPORT');
                break;
            case RequestType.TRACKER_STATUS:
                await stepContext.context.sendActivity('Testing TRACKER_STATUS');
                break;
            case RequestType.REPORT_STATUS:
                await stepContext.context.sendActivity('Testing REPORT_STATUS');
                break;
            case RequestType.REQUEST_REVALIDATION:
                await stepContext.context.sendActivity('Testing REQUEST_REVALIDATION');
                break;
            default:
                break;
        }

        // Give the user instructions about what to do next
        await stepContext.context.sendActivity('We are verifying your request... Please be patient.');

        return await stepContext.next(stepContext.result);
    }

    /**
     * Complete the interaction and end the dialog.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        if (stepContext.result) {
            const context = stepContext.options as RequestContext;

            return await stepContext.endDialog(context);
        }
        return await stepContext.endDialog();
    }

    /**
     * Create the choices with synonyms to render for the user during the ChoicePrompt.
     * (Indexes and upper/lower-case variants do not need to be added as synonyms)
     */
    public getChoices() {
        const cardOptions = [
            {
                synonyms: ['report', 'access report'],
                value: 'Report'
            },
            {
                synonyms: ['tracker', 'access tracker'],
                value: 'Tracker'
            },
            {
                synonyms: ['request report status', 'report status'],
                value: 'Report Status'
            },
            {
                synonyms: ['tracker status', 'request tracker status'],
                value: 'Tracker Status'
            },
            {
                synonyms: ['revalidation', 'request revalidation', 'access revalidation'],
                value: 'Revalidation'
            },
        ];

        return cardOptions;
    }

}
