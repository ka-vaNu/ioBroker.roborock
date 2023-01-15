"use strict";

// System dictionary
const fs = require("fs");
const path = require("path");
const crypto = require("node:crypto");
const axios = require("axios");

// eslint-disable-next-line prefer-const
let systemDictionary = {};
eval(fs.readFileSync(path.join(__dirname, "/admin/words.js")).toString());

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const tools = require("./lib/tools");

// Load your modules here, e.g.:
// const fs = require("fs");

class Roborock extends utils.Adapter {
	/**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
	constructor(options) {
		super({
			...options,
			name: "roborock",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
     * Is called when databases are connected and adapter received configuration.
     */
	async onReady() {
		// Initialize your adapter here

		// Reset the connection indicator during startup
		this.setState("info.connection", false, true);

		this.getForeignObject("system.config", (err, systemConfig) => {
			if (systemConfig) this.language = systemConfig.common.language;
		});

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		if (!this.config.username || this.config.username.trim().length < 1) throw `Not valid username '${this.config.username}' set in adapter configuration!`;
		if (!this.config.password || this.config.password.trim().length < 2) throw `Not valid password '${this.config.password}' set in adapter configuration`;

		/*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */
		// TODO: We will actually not need these states, this is just temporarily...
		await this.setObjectNotExistsAsync("userdata", { type: "state", common: { name: "Roborock userdata", type: "string", role: "json", read: true, write: false, def: "" }, native: {} });
		await this.setObjectNotExistsAsync("homedata", { type: "state", common: { name: "Roborock homedata", type: "string", role: "json", read: true, write: false, def: "" }, native: {} });


		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		//this.subscribeStates('testVariable');
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates('lights.*');
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates('*');
		// Get userdata and homedata
		if (await this.loginGetUserdata()) {
			await this.getRoborockUserHomedata();
		} else {
			this.log.error("Login failed");
		}
	}

	/**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	//     if (obj) {
	//         // The object was changed
	//         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	//     } else {
	//         // The object was deleted
	//         this.log.info(`object ${id} deleted`);
	//     }
	// }

	/**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	//     if (typeof obj === 'object' && obj.message) {
	//         if (obj.command === 'send') {
	//             // e.g. send email or pushover or whatever
	//             this.log.info('send command');

	//             // Send response in callback if required
	//             if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	//         }
	//     }
	// }
	async loginGetUserdata() {
		/********************************
         * Initialize the login API (which is needed to get access to the real API).
         ********************************/
		let success = false;
		this.log.debug(`${this.config.username}: Initializing the login API...`);
		const clientId = crypto.createHash("md5").update(this.config.username).update("should_be_unique").digest().toString("base64");
		//this.log.debug(`clientId: ${clientId}`);
		this.loginApi = axios.create({
			baseURL: "https://euiot.roborock.com",
			headers: {
				header_clientid: clientId,
			},
		});
		// api/v1/getUrlByEmail(email = ...)

		/*********************************
         * Get userdata
         *********************************/
		this.log.debug(`${this.config.username}: Getting user data...`);
		// Get existing data from ioBroker state 'userdata'
		//const userdataObj = await this.getStateAsync('userdata');
		//this.log.debug('Userdata: ' + JSON.stringify(userdataObj));
		this.log.debug(`${this.config.username}: Freshly getting user data from Roborock Cloud.`);
		// Log in.
		try {
			//data = await this.loginApi
			await this.loginApi
				.post(
					"api/v1/login",
					new URLSearchParams({
						username: this.config.username,
						password: this.config.password,
						needtwostepauth: "false",
					}).toString(),
				)
				.then((response) => {
					this.log.debug("Login Result : " + JSON.stringify(response.data));
					this.userdata = response.data.data;
					if (response.data.code === 200) {
						// Anmelde-Request erfolgreich
						this.setState("info.connection", { val: true, ack: true });
						success = true;
					}
				});
		} catch (err) {
			this.log.error("Error on Login-Request : " + JSON.stringify(err));
		}
		this.log.debug("Userdata from API: " + JSON.stringify(this.userdata));
		// Userdata States zuordnen
		// TODO: States für Userdata anlegen und füllen
		await this.setObjectNotExistsAsync("User", { type: "device", common: { name: systemDictionary["USERINFO"][this.language] }, native: {} });
		for (const userElement in this.userdata) {
			this.log.debug("userElement " + userElement + " : " + JSON.stringify(this.userdata[userElement]));
			/*		if (userElement === "rriot") {
                        await this.setObjectNotExistsAsync("User.rriot", { type: "device", common: { name: systemDictionary["RRIOT"][this.language] }, native: {} });
                        for (const rriotElement in this.userdata["rriot"]) {
                            this.log.debug("rriotElement " + rriotElement + " : " + this.userdata["rriot"][rriotElement]);
                            await this.setObjectNotExistsAsync("User.rriot." + rriotElement, { type: "state", common: { name: "123", type: "string", role: "info", read: true, write: false, def: "" }, native: {} });
                            await this.setStateAsync("User.rriot." + rriotElement, { val: this.userdata["rriot"][rriotElement], ack: true });
                        }
                    } else {*/
			//await this.setObjectNotExistsAsync('User.' + e, { type: 'state', common: { name: systemDictionary[e][this.language], type: 'string', role: 'info', read: true, write: false, def: ''  }, native: {} });
			await this.setObjectNotExistsAsync("User." + userElement, { type: "state", common: { name: "123", type: "string", role: "info", read: true, write: false, def: "" }, native: {} });
			await this.setStateAsync("User." + userElement, { val: this.userdata[userElement], ack: true });
			//}
		}
		// Nur zu Info-Zecken TODO: Wieder raus
		await this.setStateAsync("userdata", { val: JSON.stringify(this.userdata), ack: true });
		// Alternative without password:
		// await loginApi.post('api/v1/sendEmailCode', new url.URLSearchParams({username: username, type: 'auth'}).toString()).then(res => res.data);
		// // ... get code from user ...
		// userdata = await loginApi.post('api/v1/loginWithCode', new url.URLSearchParams({username: username, verifycode: code, verifycodetype: 'AUTH_EMAIL_CODE'}).toString()).then(res => res.data.data);
		return success;
	}


	async getRoborockUserHomedata() {
		try {
			/*********************************
             * Get home details
             *********************************/
			this.log.debug(`${this.config.username}: Getting home details...`);
			if ("token" in this.userdata) {
				this.loginApi.defaults.headers.common["Authorization"] = this.userdata.token;
				const rriot = this.userdata.rriot;
				const homeId = await this.loginApi.get("api/v1/getHomeDetail").then((res) => res.data.data.rrHomeId);

				// Initialize the real API.
				this.log.debug(`${this.config.username}: Initializing the "real" Roborock API...`);
				const api = axios.create({
					baseURL: rriot.r.a,
				});
				api.interceptors.request.use((config) => {
					const timestamp = Math.floor(Date.now() / 1000);
					const nonce = crypto.randomBytes(6).toString("base64").substring(0, 6).replace("+", "X").replace("/", "Y");
					const url = new URL(api.getUri(config));
					const prestr = [rriot.u, rriot.s, nonce, timestamp, md5hex(url.pathname), /*queryparams*/ "", /*body*/ ""].join(":");
					const mac = crypto.createHmac("sha256", rriot.h).update(prestr).digest("base64");
					if (!config?.headers) throw `Expected 'config' and 'config.headers' not to be undefined`;
					config.headers.Authorization = `Hawk id="${rriot.u}", s="${rriot.s}", ts="${timestamp}", nonce="${nonce}", mac="${mac}"`;
					return config;
				});
				this.homedata = await api.get(`user/homes/${homeId}`).then((res) => res.data.result);
				if (!this.homedata || !this.homedata.id || !this.homedata.name || !this.homedata.products) throw `${this.config.username}: Could not receive valid home data!`;
				for (const product of this.homedata.products) {
					this.log.debug(`${this.homedata.name}: Received ${product.name} (model: ${product.model})`);
				}
				// Nur zu Info-Zecken TODO: Wieder raus
				await this.setStateAsync("homedata", { val: JSON.stringify(this.homedata), ack: true });
				// Create objects
				this.log.debug("products : " + JSON.stringify(this.homedata.products));
				if (this.homedata.products) {
					for (const prod of this.homedata.products) {
						this.log.debug(`Creating objects for ${prod.name} - id: ${prod.id} ...`);
						await this.setObjectNotExistsAsync(prod.id, { type: "device", common: { name: prod.name }, native: {} });
						await this.setObjectNotExistsAsync(`${prod.id}.info`, { type: "channel", common: { name: "Information" }, native: {} });
						// Erst mal alle als String
						// TODO: Verbessern
						for (const itm of prod.schema) {
							this.log.debug(`Create state for ${prod.id}.info.${itm.code} ...`);
							await this.setObjectNotExistsAsync(`${prod.id}.info.${itm.code}`, { type: "state", common: { name: `${itm.code}`, type: "string", role: "info", read: true, write: false, def: "" }, native: {} });
						}
					}

					// TODO: This just as a test, to wait certain seconds
					this.log.info(`- wait 2 seconds ----------------------------------------`);
					await tools.wait(2000);

					//await this.main();
				} else {
					this.log.error("No homedata available");
				}
			} else {
				this.log.error("Kein Session-Token ermittelt, User/Password falsch?");
			}
		} catch (e) {
			this.log.error(tools.err2Str(e));
		}
	}
}

/**
 * convert MD5 to HEX
 * @param str MD5
 * @returns hex
 */
function md5hex(str) {
	return crypto.createHash("md5").update(str).digest("hex");
}

/**
 * convert MD5 to BIN
 * @param str MD5
 * @returns BIN buffer
function md5bin(str) {
    return crypto.createHash("md5").update(str).digest();
}
*/

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
	module.exports = (options) => new Roborock(options);
} else {
	// otherwise start the instance directly
	new Roborock();
}
