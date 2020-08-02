// Pulled from: https://github.com/sindresorhus/refined-github/blob/9723b391d58ff29be41950b9c6c2ceca04e6b107/source/libs/post-form.ts
export default async function postForm(form) {
	const contentFetch = typeof window.content === 'object' ? window.content.fetch : window.fetch;

	const response = await contentFetch(form.action, {
		body: new URLSearchParams(new FormData(form)),
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	});

	if (!response.ok) {
		throw new Error(response.statusText);
	}

	return response;
}
