const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const execSync = require('child_process').execSync;
const io = require('socket.io-client');
const config = require('./config')['prod'];
const utils = require('./utils');

let socket = null;
let resultInfo = null;

/**
 * socket 连接
 * @param params
 */
const connectionSocket = (params) => {
	// 获取用户认证令牌(本地获取)
	const authPath = path.join(__dirname, './auth');
	if (!fs.existsSync(authPath)) {
		fs.writeFileSync(authPath, '', 'utf-8');
	}
	const authInfo = fs.readFileSync(authPath, 'utf-8');
	let pushFlag = false;
	// 连接socket后端服务器
	socket = io.connect(config.socketUrl);
	socket.on('connect', function () {
		if (authInfo && !pushFlag) {
			socket.emit('data', { authInfo, params });
			pushFlag = true;
		}
	});
	socket.on('data', function (data) {
		downloadFile(data.list, params.node_modules_path, data.username);
	});
	socket.on('result', function (result) {
		resultInfo = result;
	});
	
	const command = params.command.toLowerCase();
	if (!authInfo || command === 'login' || command === 'l') {
		let username = null, password = null;
		process.stdin.setEncoding('utf8');
		process.stdout.write('Username: ');
		process.stdin.on('data', function (chunk) {
			if (chunk !== null) {
				if (!username) {
					username = chunk;
					process.stdout.write('Password: ');
				} else {
					password = chunk;
					process.stdin.emit('login');
				}
			}
		});
		process.stdin.on('login', () => {
			if (username && password) {
				socket.emit('login', { username: username.replace('\n', ''), password: password.replace('\n', '') });
			}
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

/**
 * 下载文件
 * @param filePaths
 * @param node_modules_path
 * @param username
 */
const downloadFile = (filePaths, node_modules_path, username) => {

	deleteTmpDir(node_modules_path);
	
	// 队列发送数据
	const step = 1;
	let filePathList = [], start = 0, end = step;
	const pushData = () => {
		filePathList = filePaths.slice(start, end);
		batch(filePathList, node_modules_path, username, () => {
			start += filePathList.length;
			end += filePathList.length;
			if (start < filePaths.length) {
				pushData();
			}
			if (start === filePaths.length) {
				execSync(`cp -r ${node_modules_path}/node_modules/.loading/* ${node_modules_path}/node_modules/`);
				deleteTmpDir(node_modules_path);
				console.log(resultInfo);
			}
		});
	};
	pushData();
};

/**
 * 删除临时目录
 * @param node_modules_path
 */
const deleteTmpDir = (node_modules_path) => {
	execSync(`rm -rf ${node_modules_path}/node_modules/.loading/`);
};

/**
 * 分批处理
 */
const batch = (list, node_modules_path, username, callback) => {
	for (const filePath of list) {
		const output = path.join(node_modules_path, '/node_modules/.loading/', filePath);
		fse.ensureDirSync(path.dirname(output)); // 文件夹不存在则创建
		const url = `${config.downloadUrl}/${username}/node_modules${filePath}`;
		utils.download(url, output, callback);
	}
};

module.exports.connectionSocket = connectionSocket;