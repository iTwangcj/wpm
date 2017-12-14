const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const io = require('socket.io-client');
const config = require('./config');

let socket = null;

const connectionSocket = (params) => {
	// 获取用户认证令牌(本地获取)
	const authPath = path.join(__dirname, './auth');
	if (!fs.existsSync(authPath)) {
		fs.writeFileSync(authPath, '', 'utf-8');
	}
	const authInfo = fs.readFileSync(authPath, 'utf-8');
	
	// 连接socket后端服务器
	socket = io.connect(config.socketUrl);
	socket.on('connect', function () {
		socket.emit('data', { authInfo, params });
	});
	socket.on('data', function (data) {
		// console.log('Server Response data: %s', JSON.stringify(data, null, 4));
		// 写入数据（binary）
		if (!fse.ensureFileSync(data.path)) { // 文件不存在则创建
			fs.writeFileSync(data.path, data.data);
		}
	});
	socket.on('result', function (result) {
		console.log(result);
		socket.disconnect();
	});
	
	if (!authInfo) {
		let username, password;
		process.stdin.setEncoding('utf8');
		process.stdout.write('Username: ');
		process.stdin.on('data', function (chunk) {
			if (chunk !== null) {
				if (!username) {
					username = chunk.replace('\n', '');
					process.stdout.write('Password: ');
				} else {
					password = chunk.replace('\n', '');
					process.stdin.emit('login');
				}
			}
		});
		process.stdin.on('login', () => {
			socket.emit('login', { username, password });
		});
		socket.on('validation', function (msg) {
			process.stdout.write(msg + ',请重新登陆\n');
			username = password = null;
			process.stdout.write('Username: ');
		});
		socket.on('login_success', function (result) {
			fs.writeFileSync(authPath, result.toString(), 'utf-8');
			process.stdout.write('用户登陆成功, 请开始愉快的玩耍吧!\n');
			process.exit(0);
		});
	}
};

module.exports.connectionSocket = connectionSocket;