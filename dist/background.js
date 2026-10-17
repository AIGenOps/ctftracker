//#region src/core/event-schema.ts
var e = {
	sevenDays: !0,
	twentyFourHours: !0,
	oneHour: !0,
	fifteenMinutes: !0,
	deadline: !0,
	eventEnd: !0,
	deadlineLeadMinutes: 1440,
	endLeadMinutes: 15
}, t = {
	automaticPromptsEnabled: !0,
	timezoneDisplay: "local",
	theme: "minimal-dark",
	defaultReminderPreferences: e,
	deadlineLeadMinutes: 1440,
	endLeadMinutes: 15,
	externalDetectionEnabled: !0,
	schemaVersion: 1
};
//#endregion
//#region src/core/event-normalizer.ts
function n(e) {
	if (!e || typeof e != "string") return;
	let t = e.trim();
	if (t) try {
		let e = new URL(t);
		return e.protocol !== "http:" && e.protocol !== "https:" ? void 0 : e.pathname === "/" && !e.search && !e.hash ? `${e.protocol}//${e.host}` : e.toString();
	} catch {
		return;
	}
}
function r(e) {
	return !e || typeof e != "string" ? "" : e.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
}
function i(e, t, n, r = /* @__PURE__ */ new Date()) {
	if (n === "cancelled" || n === "postponed") return n;
	if (!e) return "unknown";
	let i = new Date(e).getTime();
	if (isNaN(i)) return "unknown";
	let a = r.getTime();
	if (a < i) return "upcoming";
	if (t) {
		let e = new Date(t).getTime();
		if (!isNaN(e)) return a > e ? "ended" : "live";
	}
	return a - i < 1728e5 ? "live" : "ended";
}
function a(e) {
	return `${e.startAt || "none"}__${e.endAt || "none"}__${e.registrationDeadlineAt || "none"}__${e.lifecycle || "unknown"}`;
}
function o(e = "ctf") {
	let t = Math.random().toString(36).substring(2, 10);
	return `${e}_${Date.now().toString(36)}_${t}`;
}
//#endregion
//#region src/core/deduplication.ts
function s(e, t) {
	if (t) {
		if (t.id) {
			let n = e.find((e) => e.id === t.id);
			if (n) return n;
		}
		if (t.source && t.sourceEventId) {
			let n = e.find((e) => e.source === t.source && e.sourceEventId === t.sourceEventId);
			if (n) return n;
		}
		if (t.ctftimeUrl) {
			let r = n(t.ctftimeUrl);
			if (r) {
				let t = e.find((e) => e.ctftimeUrl && n(e.ctftimeUrl) === r);
				if (t) return t;
			}
		}
		if (t.websiteUrl) {
			let r = n(t.websiteUrl);
			if (r && !c(r)) {
				let t = e.find((e) => e.websiteUrl && n(e.websiteUrl) === r);
				if (t) return t;
			}
		}
	}
}
function c(e) {
	try {
		let t = new URL(e).hostname.toLowerCase();
		return t === "ctftime.org" || t === "ctfd.io" || t === "github.com" || t === "discord.gg" || t === "twitter.com" || t === "x.com";
	} catch {
		return !0;
	}
}
function l(e, t, n = !0) {
	let r = new Set(e.verifiedFields || []), i = { ...e };
	for (let [e, a] of Object.entries(t)) e !== "id" && e !== "createdAt" && (!n || !r.has(e) || a != null && a !== "") && a != null && a !== "" && (i[e] = a);
	if (t.verifiedFields) {
		let n = /* @__PURE__ */ new Set([...e.verifiedFields, ...t.verifiedFields]);
		i.verifiedFields = Array.from(n);
	}
	return i.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), i;
}
function u(e, t) {
	let n = [], r = [], i = [];
	for (let a of t) {
		let t = s(e, a);
		if (!t) {
			n.push(a);
			continue;
		}
		let o = [];
		for (let e of [
			"name",
			"status",
			"lifecycle",
			"format",
			"startAt",
			"endAt",
			"registrationDeadlineAt",
			"websiteUrl",
			"teamMode",
			"teamName",
			"notes"
		]) {
			let n = t[e], r = a[e];
			r != null && r !== "" && r !== n && o.push({
				field: e,
				existingValue: n,
				incomingValue: r
			});
		}
		o.length > 0 ? i.push({
			existing: t,
			incoming: a,
			differingFields: o
		}) : r.push(a);
	}
	return {
		newEvents: n,
		identicalEvents: r,
		conflictingEvents: i
	};
}
//#endregion
//#region src/core/event-repository.ts
var d = {
	EVENTS: "ctf_tracker_events",
	SETTINGS: "ctf_tracker_settings",
	DELIVERY_HISTORY: "ctf_tracker_delivery_history"
}, f = {};
async function p(e, t) {
	if (typeof chrome < "u" && chrome.storage && chrome.storage.local) return new Promise((n) => {
		chrome.storage.local.get([e], (r) => {
			chrome.runtime.lastError ? (console.error("Storage read error:", chrome.runtime.lastError), n(t)) : n(r[e] === void 0 ? t : r[e]);
		});
	});
	if (typeof localStorage < "u") try {
		let t = localStorage.getItem(e);
		if (t !== null) return JSON.parse(t);
	} catch {}
	return f[e] === void 0 ? t : f[e];
}
async function m(e, t) {
	if (typeof chrome < "u" && chrome.storage && chrome.storage.local) return new Promise((n, r) => {
		chrome.storage.local.set({ [e]: t }, () => {
			chrome.runtime.lastError ? r(chrome.runtime.lastError) : n();
		});
	});
	if (typeof localStorage < "u") try {
		localStorage.setItem(e, JSON.stringify(t));
	} catch {}
	f[e] = t;
}
var h = new class {
	async getEvents() {
		return (await p(d.EVENTS, [])).map((e) => ({
			...e,
			lifecycle: i(e.startAt, e.endAt, e.lifecycle)
		}));
	}
	async getEventById(e) {
		return (await this.getEvents()).find((t) => t.id === e);
	}
	async findMatchingEvent(e) {
		return s(await this.getEvents(), e);
	}
	async saveEvent(t) {
		let a = await this.getEvents(), c = s(a, t), u = (/* @__PURE__ */ new Date()).toISOString();
		if (c) {
			let e = l(c, t), n = a.map((t) => t.id === c.id ? e : t);
			return await m(d.EVENTS, n), e;
		}
		let f = t.status || "interested", p = {
			id: t.id || o(),
			name: r(t.name),
			status: f,
			lifecycle: i(t.startAt, t.endAt, t.lifecycle),
			format: t.format || "unknown",
			source: t.source || "manual",
			sourceEventId: t.sourceEventId,
			ctftimeUrl: n(t.ctftimeUrl),
			websiteUrl: n(t.websiteUrl),
			registrationUrl: n(t.registrationUrl),
			startAt: t.startAt,
			endAt: t.endAt,
			timezone: t.timezone || "UTC",
			registrationDeadlineAt: t.registrationDeadlineAt,
			teamMode: t.teamMode || "solo",
			teamName: r(t.teamName),
			weight: t.weight,
			points: t.points,
			notes: r(t.notes),
			reminderPreferences: {
				...e,
				...t.reminderPreferences || {}
			},
			createdAt: t.createdAt || u,
			updatedAt: u,
			dismissedPrompt: !!t.dismissedPrompt,
			verifiedFields: t.verifiedFields || ["name"],
			fieldSources: t.fieldSources || { name: t.source || "manual" }
		};
		return a.push(p), await m(d.EVENTS, a), p;
	}
	async updateEvent(e, t) {
		let n = await this.getEvents(), r = n.findIndex((t) => t.id === e);
		if (r === -1) throw Error(`Event with id "${e}" not found.`);
		let a = n[r], o = l(a, t, !1);
		return o.lifecycle = i(o.startAt, o.endAt, t.lifecycle || o.lifecycle), o.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), n[r] = o, await m(d.EVENTS, n), o;
	}
	async setEventStatus(e, t) {
		return this.updateEvent(e, { status: t });
	}
	async deleteEvent(e) {
		let t = await this.getEvents(), n = t.filter((t) => t.id !== e);
		return n.length !== t.length && (await m(d.EVENTS, n), !0);
	}
	async getSettings() {
		let e = await p(d.SETTINGS, t);
		return {
			...t,
			...e
		};
	}
	async updateSettings(e) {
		let t = {
			...await this.getSettings(),
			...e
		};
		return await m(d.SETTINGS, t), t;
	}
	async getDeliveryHistory() {
		return p(d.DELIVERY_HISTORY, []);
	}
	async recordDelivery(e) {
		let t = await this.getDeliveryHistory(), n = t.findIndex((t) => t.id === e.id);
		n === -1 ? t.push(e) : t[n] = e, t.length > 500 && t.splice(0, t.length - 500), await m(d.DELIVERY_HISTORY, t);
	}
	async exportData() {
		let e = await this.getEvents(), t = await this.getSettings();
		return {
			schemaVersion: 1,
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			settings: t,
			events: e
		};
	}
	async previewImport(t) {
		let i = [];
		if (!t || typeof t != "object") return {
			valid: !1,
			errors: ["Import file must be a valid JSON object."]
		};
		Array.isArray(t.events) || i.push("Missing \"events\" array in import payload.");
		let a = /* @__PURE__ */ new Set([
			"interested",
			"planned",
			"registered",
			"participated",
			"not_participating"
		]), s = [];
		return Array.isArray(t.events) && t.events.forEach((t, c) => {
			!t || typeof t != "object" ? i.push(`Event at index ${c} is not an object.`) : !t.name || typeof t.name != "string" || !t.name.trim() ? i.push(`Event at index ${c} has a missing or empty name.`) : t.status && !a.has(t.status) ? i.push(`Event "${t.name}" has invalid status "${t.status}".`) : s.push({
				id: t.id || o(),
				name: r(t.name),
				status: a.has(t.status) ? t.status : "interested",
				lifecycle: t.lifecycle || "unknown",
				format: t.format || "unknown",
				source: t.source || "manual",
				sourceEventId: t.sourceEventId ? String(t.sourceEventId) : void 0,
				ctftimeUrl: n(t.ctftimeUrl),
				websiteUrl: n(t.websiteUrl),
				registrationUrl: n(t.registrationUrl),
				startAt: t.startAt,
				endAt: t.endAt,
				timezone: t.timezone || "UTC",
				registrationDeadlineAt: t.registrationDeadlineAt,
				teamMode: t.teamMode === "team" ? "team" : "solo",
				teamName: r(t.teamName),
				weight: typeof t.weight == "number" ? t.weight : void 0,
				points: typeof t.points == "number" ? t.points : void 0,
				notes: r(t.notes),
				reminderPreferences: {
					...e,
					...t.reminderPreferences || {}
				},
				createdAt: t.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
				updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
				dismissedPrompt: !!t.dismissedPrompt,
				verifiedFields: Array.isArray(t.verifiedFields) ? t.verifiedFields : ["name"]
			});
		}), i.length > 0 ? {
			valid: !1,
			errors: i
		} : {
			valid: !0,
			sanitizedEvents: s,
			analysis: u(await this.getEvents(), s)
		};
	}
	async applyImport(e, t = "merge", n) {
		let r = await this.previewImport(e);
		if (!r.valid || !r.sanitizedEvents) return {
			success: !1,
			importedCount: 0,
			errors: r.errors
		};
		let i = r.sanitizedEvents;
		if (t === "replace") return await m(d.EVENTS, i), e.settings && await this.updateSettings(e.settings), {
			success: !0,
			importedCount: i.length
		};
		let a = await this.getEvents(), o = /* @__PURE__ */ new Map();
		a.forEach((e) => o.set(e.id, e));
		for (let e of i) {
			let t = s(Array.from(o.values()), e);
			if (!t) o.set(e.id, e);
			else if ((n ? n[t.id] : "use_imported") === "use_imported") {
				let n = l(t, e);
				o.set(t.id, n);
			}
		}
		let c = Array.from(o.values());
		return await m(d.EVENTS, c), e.settings && await this.updateSettings(e.settings), {
			success: !0,
			importedCount: i.length
		};
	}
}(), g = 6048e5, _ = 864e5, v = 36e5, y = 9e5;
function b(e) {
	return e.lifecycle === "cancelled" || e.status === "not_participating" || e.status === "participated";
}
function x(e, t = /* @__PURE__ */ new Date()) {
	if (b(e)) return [];
	let n = t.getTime(), r = e.reminderPreferences, i = a(e), o = [], s = e.startAt ? new Date(e.startAt).getTime() : NaN, c = e.endAt ? new Date(e.endAt).getTime() : NaN, l = e.registrationDeadlineAt ? new Date(e.registrationDeadlineAt).getTime() : NaN;
	if (r.sevenDays && !isNaN(s) && e.lifecycle !== "ended") {
		let t = s - g;
		t > n && o.push({
			eventId: e.id,
			reminderType: "7d",
			alarmName: S(e.id, "7d", i),
			triggerTime: t,
			scheduleFingerprint: i,
			title: `CTF in 7 days: ${e.name}`,
			message: `Competition begins in 1 week (${w(e.startAt)}). Make sure your team and tools are ready!`
		});
	}
	if (r.twentyFourHours && !isNaN(s) && e.lifecycle !== "ended") {
		let t = s - _;
		t > n && o.push({
			eventId: e.id,
			reminderType: "24h",
			alarmName: S(e.id, "24h", i),
			triggerTime: t,
			scheduleFingerprint: i,
			title: `CTF starts tomorrow: ${e.name}`,
			message: `Only 24 hours until kickoff at ${w(e.startAt)}. Check your team credentials!`
		});
	}
	if (r.oneHour && !isNaN(s) && e.lifecycle !== "ended") {
		let t = s - v;
		t > n && o.push({
			eventId: e.id,
			reminderType: "1h",
			alarmName: S(e.id, "1h", i),
			triggerTime: t,
			scheduleFingerprint: i,
			title: `1 hour alert: ${e.name}`,
			message: "Competition begins in 60 minutes. Join the platform and prepare your environment!"
		});
	}
	if (r.fifteenMinutes && !isNaN(s) && e.lifecycle !== "ended") {
		let t = s - y;
		t > n && o.push({
			eventId: e.id,
			reminderType: "15m",
			alarmName: S(e.id, "15m", i),
			triggerTime: t,
			scheduleFingerprint: i,
			title: `Starting in 15 minutes: ${e.name}`,
			message: `Countdown begins! ${e.name} starts momentarily. Good luck!`
		});
	}
	if (r.deadline && !isNaN(l)) {
		let t = l - (r.deadlineLeadMinutes || 1440) * 60 * 1e3;
		t > n && o.push({
			eventId: e.id,
			reminderType: "deadline",
			alarmName: S(e.id, "deadline", i),
			triggerTime: t,
			scheduleFingerprint: i,
			title: `Registration closing soon: ${e.name}`,
			message: `Deadline closes at ${w(e.registrationDeadlineAt)}. Register now so you don't miss out!`
		});
	}
	if (r.eventEnd && !isNaN(c)) {
		let t = c - (r.endLeadMinutes || 15) * 60 * 1e3;
		t > n && o.push({
			eventId: e.id,
			reminderType: "eventEnd",
			alarmName: S(e.id, "eventEnd", i),
			triggerTime: t,
			scheduleFingerprint: i,
			title: `Final sprint: ${e.name} ends in ${r.endLeadMinutes || 15} minutes!`,
			message: "Submit your pending flags and wrap up final writeups before the scoreboard freezes!"
		});
	}
	return o;
}
function S(e, t, n) {
	return `ctf_reminder__${e}__${t}__${n}`;
}
function C(e) {
	let t = e.split("__");
	return t.length < 4 || t[0] !== "ctf_reminder" ? null : {
		eventId: t[1],
		reminderType: t[2],
		scheduleFingerprint: t.slice(3).join("__")
	};
}
function w(e) {
	if (!e) return "";
	try {
		return new Date(e).toLocaleString(void 0, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	} catch {
		return e;
	}
}
var T = new class {
	async reconcileAlarms() {
		if (typeof chrome > "u" || !chrome.alarms) return;
		let e = await h.getEvents(), t = /* @__PURE__ */ new Map();
		for (let n of e) {
			let e = x(n, /* @__PURE__ */ new Date());
			for (let n of e) t.set(n.alarmName, {
				triggerTime: n.triggerTime,
				eventId: n.eventId
			});
		}
		let n = (await chrome.alarms.getAll()).filter((e) => e.name.startsWith("ctf_reminder__"));
		for (let e of n) t.has(e.name) || await chrome.alarms.clear(e.name);
		let r = new Set(n.map((e) => e.name));
		for (let [e, n] of t.entries()) r.has(e) || await chrome.alarms.create(e, { when: n.triggerTime });
	}
	async handleAlarm(e) {
		let t = C(e.name);
		if (!t) return;
		let { eventId: n, reminderType: r, scheduleFingerprint: i } = t, a = await h.getEventById(n);
		if (!a || b(a) || (await h.getDeliveryHistory()).some((t) => t.id === e.name && t.state === "delivered")) return;
		let o = `CTF Alert: ${a.name}`, s = `Competition alert for ${a.name}.`;
		switch (r) {
			case "7d":
				o = `7 Days Until ${a.name}`, s = "The competition kicks off in 1 week. Prepare your environment and team.";
				break;
			case "24h":
				o = `24 Hours Until ${a.name}`, s = "Starting tomorrow. Review rules, credentials, and connectivity.";
				break;
			case "1h":
				o = `1 Hour Until ${a.name}`, s = "Starting in 60 minutes. Prepare your tools and workspace.";
				break;
			case "15m":
				o = `15 Minutes Until Kickoff: ${a.name}`, s = "The competition begins in 15 minutes.";
				break;
			case "deadline":
				o = `Registration Deadline Approaching: ${a.name}`, s = "Registration closes soon. Finalize and verify your registration.";
				break;
			case "eventEnd": o = `15 Minutes Remaining: ${a.name}`, s = "Competition ends in 15 minutes. Submit remaining flags now.";
		}
		let c = `notif__${e.name}`;
		typeof chrome < "u" && chrome.notifications && chrome.notifications.create(c, {
			type: "basic",
			iconUrl: "icons/icon-128.png",
			title: o,
			message: s,
			priority: 2,
			requireInteraction: !0
		}), await h.recordDelivery({
			id: e.name,
			eventId: n,
			reminderType: r,
			scheduledFor: new Date(e.scheduledTime).toISOString(),
			scheduleFingerprint: i,
			state: "delivered",
			deliveredAt: (/* @__PURE__ */ new Date()).toISOString(),
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
	}
}();
//#endregion
//#region src/background/message-router.ts
async function E(e, t) {
	if (!e || typeof e != "object") return { error: "Invalid message payload" };
	switch (e.type) {
		case "DETECT_EVENT": {
			let t = e.candidate, n = await h.getSettings(), r = await h.findMatchingEvent(t), i = n.automaticPromptsEnabled && (!r || r.dismissedPrompt === !1);
			return {
				existingEvent: r || null,
				shouldPrompt: i,
				settings: n
			};
		}
		case "PROMPT_SAVE_EVENT": {
			let { candidate: t, status: n } = e, r = await h.saveEvent({
				...t,
				status: n,
				dismissedPrompt: !1
			});
			return await T.reconcileAlarms(), {
				success: !0,
				event: r
			};
		}
		case "GET_EVENTS": return { events: await h.getEvents() };
		case "GET_EVENT": return { event: await h.getEventById(e.id) };
		case "CREATE_EVENT":
		case "SAVE_EVENT": {
			let t = await h.saveEvent(e.event);
			return await T.reconcileAlarms(), {
				success: !0,
				event: t
			};
		}
		case "UPDATE_EVENT": {
			let t = await h.updateEvent(e.id, e.updates);
			return await T.reconcileAlarms(), {
				success: !0,
				event: t
			};
		}
		case "DELETE_EVENT": {
			let t = await h.deleteEvent(e.id);
			return await T.reconcileAlarms(), { success: t };
		}
		case "SET_EVENT_STATUS": {
			let t = await h.setEventStatus(e.id, e.status);
			return await T.reconcileAlarms(), {
				success: !0,
				event: t
			};
		}
		case "GET_SETTINGS": return { settings: await h.getSettings() };
		case "UPDATE_SETTINGS": {
			let t = await h.updateSettings(e.updates);
			return await T.reconcileAlarms(), { settings: t };
		}
		case "RECONCILE_ALARMS": return await T.reconcileAlarms(), { success: !0 };
		case "EXPORT_DATA": return { data: await h.exportData() };
		case "IMPORT_PREVIEW": return await h.previewImport(e.rawJson);
		case "IMPORT_APPLY": {
			let t = await h.applyImport(e.rawJson, e.mode || "merge", e.resolutions);
			return t.success && await T.reconcileAlarms(), t;
		}
		case "OPEN_DASHBOARD": {
			let t = chrome.runtime.getURL("dashboard.html") + (e.eventId ? `?eventId=${e.eventId}` : "");
			return await chrome.tabs.create({ url: t }), { success: !0 };
		}
		default: return { error: `Unhandled message type: ${e.type}` };
	}
}
chrome.runtime.onInstalled.addListener(async () => {
	console.log("[CTF Tracker] Extension installed/updated. Reconciling alarms..."), await T.reconcileAlarms();
}), chrome.runtime.onStartup.addListener(async () => {
	console.log("[CTF Tracker] Browser startup. Reconciling alarms..."), await T.reconcileAlarms();
}), chrome.alarms.onAlarm.addListener(async (e) => {
	await T.handleAlarm(e);
}), chrome.notifications.onClicked.addListener(async (e) => {
	let t = e.match(/^notif__ctf_reminder__([^_]+)/), n = t ? t[1] : "", r = chrome.runtime.getURL("dashboard.html") + (n ? `?eventId=${n}` : "");
	await chrome.tabs.create({ url: r }), chrome.notifications.clear(e);
}), chrome.runtime.onMessage.addListener((e, t, n) => (E(e, t).then((e) => n(e)).catch((e) => {
	console.error("[CTF Tracker] Message handling error:", e), n({ error: e?.message || "Unknown error" });
}), !0));
//#endregion
