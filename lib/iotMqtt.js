async function init(ad) {
	const rriot = ad.userdata.rriot;
	const devices = ad.homedata.devices.concat(ad.homedata.receivedDevices);
	ad.log.debug("rriot : " + JSON.stringify(rriot));
	ad.log.debug("devices : " + JSON.stringify(devices));
	/*const localKeys = new Map(devices.map((device: { [k: string]: any }) => [device.duid, device.localKey]));

	const seq = 1;
	const random = 4711; // Should be initialized with a number 0 - 1999?
	const idCounter = 1;

	const endpoint = ad.md5bin(rriot.k).subarray(8, 14).toString("base64"); // Could be a random but rather static string. The app generates it on first run.
	const nonce = crypto.randomBytes(16);

	const mqttMessageParser = new Parser().endianess("big").string("version", { length: 3 }).uint32("seq").uint32("random").uint32("timestamp").uint16("protocol").uint16("payloadLen").buffer("payload", { length: "payloadLen" }).uint32("crc32");

	const protocol301Parser = new Parser().endianess("little").string("endpoint", { length: 15, stripNull: true }).uint8("unknown1").uint16("id").buffer("unknown2", { length: 6 });

	const mqttUser = ad.md5hex(rriot.u + ":" + rriot.k).substring(2, 10);
	const mqttPassword = ad.md5hex(rriot.s + ":" + rriot.k).substring(16);
    */
}

module.exports = {
	init
};