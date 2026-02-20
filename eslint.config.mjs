// Minimal ESLint config for NodeBB plugin (style guide: https://docs.nodebb.org/development/style-guide/)
// Run: npm run lint (requires eslint installed: npm install -D eslint)
export default [
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'script',
			globals: {
				require: 'readonly',
				module: 'readonly',
				exports: 'writable',
				__dirname: 'readonly',
				__filename: 'readonly',
				process: 'readonly',
				Buffer: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				Promise: 'readonly',
				Array: 'readonly',
				Object: 'readonly',
				parseInt: 'readonly',
				parseFloat: 'readonly',
			},
		},
		rules: {
			'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
		},
	},
];
