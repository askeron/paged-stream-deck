'use strict';

const fs = require('fs')
const sharp = require('sharp')
const iconRenderer = require('./icon-renderer.js')

const StreamDeck = require('elgato-stream-deck')
const streamDeck = StreamDeck.openStreamDeck()

const EventEmitter = require('events')
const eventEmitter = new EventEmitter()

const currentIcons = new Array(streamDeck.NUM_KEYS).map(x => {type:'blank'})
streamDeck.clearAllKeys()

function setIcon(index, icon) {
	if (icon.type === "iconFunction") {
		setIcon(index, icon.iconFunction())
	} else if (JSON.stringify(icon) != JSON.stringify(currentIcons[index])) {
		currentIcons[index] = icon
		setIconInternal(index, icon).catch(reason => eventEmitter.emit('error', new Error("error while setting icon: "+reason)))
	}
}

async function setIconInternal(index, icon) {
	try {
		const iconBuffer = await iconRenderer.getIconRawBuffer(icon, streamDeck.ICON_SIZE)
		streamDeck.fillImage(index, iconBuffer);
		/*
		(await iconRenderer.getIconSharp(icon, streamDeck.ICON_SIZE)).toFile(`${index}.png`, (err, info) => {
			if (err) throw err;
			console.log('The file has been saved! '+info);
		})
		//*/
	} catch (error) {
        eventEmitter.emit('error', new Error("error while drawing icon: "+error))
		streamDeck.fillImage(index, await iconRenderer.getIconBufferBlank(streamDeck.ICON_SIZE));
	}
}

streamDeck.on('up', async keyIndex => {
	if (currentPage.buttons.length >= keyIndex) {
		const button = currentPage.buttons[keyIndex]
		if (button && button.hasOwnProperty("onUp")) {
			button.onUp()
		}
	}
});

streamDeck.on('down', keyIndex => {
	if (currentPage.buttons.length >= keyIndex) {
		const button = currentPage.buttons[keyIndex]
		if (button && button.hasOwnProperty("onClick")) {
			button.onClick()
		}
		if (button && button.hasOwnProperty("onDown")) {
			button.onDown()
		}
	}
});

streamDeck.on('error', error => {
	eventEmitter.emit('error', error)
});

let currentPage = {
	name: undefined,
	buttons: [],
};

function showPage(page) {
	currentPage = page
	redraw()
}

function redraw() {
	for (let i = 0; i < streamDeck.NUM_KEYS; i++) {
		if (currentPage.buttons.length >= i+1) {
			const button = currentPage.buttons[i]
			if (button && button.hasOwnProperty("icon")) {
				setIcon(i,button.icon)
			} else {
				setIcon(i,{type:"blank"})
			}
		} else {
			setIcon(i,{type:"blank"})
		}
	}
}

function fadeIn() {
	for (let i = 0; i <= 100; i+=1) {
		setTimeout(function(percentage){
			streamDeck.setBrightness(percentage);
		},i*40,i);
	}
}

setInterval(() => redraw(), 200)

module.exports = {
	showPage,
	//fadeIn,
    getCurrentPage: (() => currentPage),
    setBrightness: ((percentage) => streamDeck.setBrightness(percentage)),
	unofficialApiUseAtYourOwnRisk: {
        streamDeck
	},
	NUM_KEYS: streamDeck.NUM_KEYS,
    MAX_KEYS: 32,
	onError: ((listener) => eventEmitter.on('error', listener)),
	simulateKeyDown: (keyIndex) => streamDeck.emit("down", keyIndex),
	simulateKeyUp: (keyIndex) => streamDeck.emit("up", keyIndex),
}

