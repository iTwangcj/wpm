#!/usr/bin/env node
const execSync = require('child_process').execSync;
const path = require('path');
const client = require('../client');

const getGlobalPath = (args) => {
	if (args.includes('-g') || args.includes('--global')) {
		// 获取npm的全局路径
		const nodePath = execSync('which node').toString();
		const nodeHome = path.resolve(nodePath, '../../');
		let global_node_modules = '';
		if (nodeHome.includes('.nvm')) {
			global_node_modules = path.resolve(nodeHome, 'lib');
		}
		return global_node_modules;
	}
	return path.resolve(process.cwd());
};

const run = (args) => {
	if (args[0] && args[0].toLowerCase() === '-v' || args[0] === '--version') {
		const pack = require('../package.json');
		console.log(`version is ${pack.version}`);
	} else if (!args.length || args[0] === '-h') {
		console.log('Useage:');
		console.log('  -h --help [show all command parameters]');
		console.log('  -l --login [user login]');
		console.log('  -v --version [show version]');
		console.log('  -i --install [install package]');
		console.log('  -u --uninstall [uninstall package]');
		console.log('  -g --global [global install package]');
	} else if (args[0] === 'uninstall' || args[0] === 'u') {
		const delArr = args.slice(1, args.length);
		const dirPath = getGlobalPath(args) + '/';
		let index = delArr.indexOf('-g');
		if (index === -1) {
			index = delArr.indexOf('--global');
		}
		if (index > -1) {
			delArr.splice(index, 1);
			for (const dir of delArr) {
				execSync(`npm uninstall ${dir} -g`);
			}
		} else {
			for (const dir of delArr) {
				execSync(`rm -rf ${path.join(dirPath, 'node_modules', dir)}`);
			}
		}
		console.log('removed packages: %s successful.', delArr.join(' '));
	} else {
		let command = args.join(' ');
		if (args.length === 1 && args[0] === 'install' || args[0] === 'i') {
			const packagePath = path.join(getGlobalPath(args), 'package.json');
			let manifest = require(packagePath);
			let dependencies = manifest.dependencies;
			let devDependencies = manifest.devDependencies;
			let externals = [];
			const getDependencies = function (_dependencies) {
				_dependencies = _dependencies || {};
				for (let p in _dependencies) {
					if (_dependencies.hasOwnProperty(p)) {
						let version = _dependencies[p].replace('^', '');
						version = version.replace('~', '');
						externals.push(p + '@' + version);
					}
				}
			};
			getDependencies(dependencies);
			getDependencies(devDependencies);
			command = 'install ' + externals.join(' ');
		}
		client.connectionSocket({
			node_modules_path: getGlobalPath(args),
			command: command
		});
	}
};
//获取除第一个命令以后的参数，使用空格拆分
run(process.argv.slice(2));