const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.dt2Inleh.js",app:"_app/immutable/entry/app.CMqkr-HQ.js",imports:["_app/immutable/entry/start.dt2Inleh.js","_app/immutable/chunks/BW7R_5xn.js","_app/immutable/chunks/CKDDdjhn.js","_app/immutable/chunks/DvZbZ4Oy.js","_app/immutable/entry/app.CMqkr-HQ.js","_app/immutable/chunks/CKDDdjhn.js","_app/immutable/chunks/BHUPHd30.js","_app/immutable/chunks/CSfnKIZ1.js","_app/immutable/chunks/DvZbZ4Oy.js","_app/immutable/chunks/DquMxK2B.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CxV2tDmH.js')),
			__memo(() => import('./chunks/1-D138hUX0.js')),
			__memo(() => import('./chunks/2-Cyh7SsDw.js')),
			__memo(() => import('./chunks/3-B-6pndWh.js')),
			__memo(() => import('./chunks/4-B6tE_z4K.js')),
			__memo(() => import('./chunks/5-_4mBdaGY.js')),
			__memo(() => import('./chunks/6-Djk5ftwT.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/book/[slotId]",
				pattern: /^\/book\/([^/]+?)\/?$/,
				params: [{"name":"slotId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/guide/tours",
				pattern: /^\/guide\/tours\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/guide/tours/[tourId]",
				pattern: /^\/guide\/tours\/([^/]+?)\/?$/,
				params: [{"name":"tourId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
