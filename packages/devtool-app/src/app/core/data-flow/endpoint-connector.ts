import { Injectable } from '@angular/core';
import * as Core from '@krix-devtool/core';

import { Environment } from '../../../environments/environment';

import { MessageRetranslator } from './message-retranslator';
import { MessageHandler } from './message-handler';

@Injectable()
export class EndpointConnector {
  constructor (
    private messageRetranslator: MessageRetranslator,
    private messageHandler: MessageHandler,
  ) {
  }

  /**
   * Creates connection to the BgS.
   *
   * @return {void}
   */
  public connect (
  ): void {
    const port = chrome.runtime.connect({
      name: Core.Constants.DTAToBgSConnectionName,
    });
    this.messageRetranslator.setBgSPort(port);

    // Get tab identifier where user opened dev-tool
    const tabId = _.get(chrome, `devtools.inspectedWindow.tabId`);
    this.messageRetranslator.setTabId(tabId);

    // eslint-disable-next-line no-unused-expressions
    Environment.production === false && console.log(`DTA.EndpointConnector.connect:`, `Tab Id: ${tabId}, Port:`, port);

    // Add `Message` watcher to port
    port.onMessage.addListener((message, senderPort) => {
      this.onMessage(message, senderPort);
    });

    // Send `Init Dev-Tool` command
    this.messageRetranslator.sendMessage(
      Core.Enums.AppEndpoint.BackgroundScript,
      Core.Enums.MsgCommands.BackgroundScript.InitDTA,
      {
        tabId: tabId,
      },
    );
  }

  /**
   * Handles a `Message` flow for a current connection.
   * - skips messages from an outside endpoint (not current tab);
   * - extracts a message endpoint from the message.
   * - sends the message to another endpoint if the message endpoint isn't the CS.
   * - dispatches the message to the CS message handler if the message endpoint is the CS.
   * - skips unsupported endpoints.
   *
   * @param  {Core.Interfaces.ExtensionMessage} message
   * @param  {chrome.runtime.Port} port
   * @return {void}
   */
  private onMessage (
    message: Core.Interfaces.ExtensionMessage,
    port: chrome.runtime.Port,
  ): void {
    // eslint-disable-next-line no-unused-expressions
    Environment.production === false && console.log(`DTA.EndpointConnector.onMessage:`, message, port);

    const tabId = this.messageRetranslator.getTabId();
    if (_.isNil(tabId) === true || message?.tabId !== tabId) {
      // eslint-disable-next-line no-unused-expressions
      Environment.production === false && console.warn(`DTA.EndpointConnector.onMessage:`,
        `DTA is trying to handle message from another tab (${message.tabId}:${message.target})`);
      return;
    }

    // Extract a message endpoint from the message
    const target = message?.target ?? null;
    switch (target) {
      // Dispatch the message to the DTA message handler
      case Core.Enums.AppEndpoint.DevToolApp:
        this.messageHandler.onMessage(message);
        return;
      // Skip unsupported endpoints
      default:
        // eslint-disable-next-line no-unused-expressions
      Environment.production === false && console.warn(`DTA.EndpointConnector.onMessage:`,
          `DTA is trying to handle the unsupported endpoint (${message.tabId}:${message.target})`);
    }
  }
}
