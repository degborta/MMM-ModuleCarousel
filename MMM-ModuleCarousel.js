Module.register("MMM-ModuleCarousel", {

	defaults: {
		groups: [],
		// Each group: { modules: [], interval: 10000, transition: 500, showIndicator: true }
	},

	getStyles() {
		return ["MMM-ModuleCarousel.css"];
	},

	start() {
		this.timers = [];
		this.groupStates = [];
	},

	getDom() {
		return document.createElement("div");
	},

	notificationReceived(notification) {
		if (notification !== "DOM_OBJECTS_CREATED") return;

		this.config.groups.forEach((group, groupIndex) => {
			const interval = group.interval || 10000;
			const transition = group.transition || 500;
			const showIndicator = group.showIndicator !== false;
			const moduleNames = group.modules || [];

			if (moduleNames.length < 2) return;

			const members = this._resolveModules(moduleNames);
			if (members.length < 2) {
				Log.warn(`MMM-ModuleCarousel: group ${groupIndex} resolved fewer than 2 modules, skipping.`);
				return;
			}

			const indicator = showIndicator ? this._createIndicator(members.length, groupIndex) : null;

			if (indicator) {
				// Insert directly after the last member's wrapper so it sits
				// adjacent to the group in the column, not at the very bottom.
				const lastWrapper = document.getElementById(members[members.length - 1].identifier);
				if (lastWrapper && lastWrapper.parentNode) {
					lastWrapper.parentNode.insertBefore(indicator, lastWrapper.nextSibling);
				}
			}

			this.groupStates[groupIndex] = { members, current: 0, transition, indicator };

			members.forEach((mod, i) => {
				if (i === 0) return;
				mod.hide(0);
			});

			const timer = setInterval(() => {
				this._advance(groupIndex);
			}, interval);

			this.timers.push(timer);
		});
	},

	_resolveModules(entries) {
		const all = MM.getModules();
		const seen = new Set();

		return entries.flatMap(entry => {
			const isObj = typeof entry === "object";
			const name = isObj ? entry.name : entry;
			const classes = isObj && entry.classes ? entry.classes.trim().split(/\s+/) : null;

			const found = all.filter(m => {
				if (m.name !== name) return false;
				if (!classes) return true;
				const modClasses = (m.data.classes || "").trim().split(/\s+/);
				return classes.every(c => modClasses.includes(c));
			});

			if (found.length === 0) {
				Log.warn(`MMM-ModuleCarousel: module "${name}"${classes ? ` (classes: ${classes.join(" ")})` : ""} not found.`);
			}

			// Deduplicate — a plain name match on a module with multiple instances
			// should only include each instance once.
			return found.filter(m => {
				if (seen.has(m.identifier)) return false;
				seen.add(m.identifier);
				return true;
			});
		});
	},

	_createIndicator(count, groupIndex) {
		const wrapper = document.createElement("div");
		wrapper.className = "mmm-carousel-indicator";
		wrapper.dataset.group = groupIndex;

		for (let i = 0; i < count; i++) {
			const dot = document.createElement("span");
			dot.className = "mmm-carousel-dot" + (i === 0 ? " active" : "");
			wrapper.appendChild(dot);
		}

		return wrapper;
	},

	_updateIndicator(indicator, index) {
		if (!indicator) return;
		indicator.querySelectorAll(".mmm-carousel-dot").forEach((dot, i) => {
			dot.classList.toggle("active", i === index);
		});
	},

	_advance(groupIndex) {
		const state = this.groupStates[groupIndex];
		const { members, current, transition, indicator } = state;
		const next = (current + 1) % members.length;

		members[current].hide(transition, () => {
			members[next].show(transition);
			this._updateIndicator(indicator, next);
		});

		state.current = next;
	},

});
