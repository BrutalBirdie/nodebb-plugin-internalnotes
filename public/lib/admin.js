'use strict';

import { save, load } from 'settings';

export function init() {
	load('internalnotes', $('.internalnotes-settings'));

	$('#save').on('click', () => {
		save('internalnotes', $('.internalnotes-settings'));
	});
}
