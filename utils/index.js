'use strict';
const fs = require('fs');
const request = require('request');

const utils = module.exports;

/**
 * 文件下载
 * @param url
 * @param output
 * @param callback
 */
utils.download = (url, output, callback) => {
	callback = callback || function () {};
	request
	.get(url)
	.on('error', (err) => {
		console.log(err);
	})
	.pipe(fs.createWriteStream(output))
	.on('close', callback);
};