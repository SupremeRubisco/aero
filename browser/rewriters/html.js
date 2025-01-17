$aero.set = (el, attr, val) => {
	// Backup element
	// For Element hooks
	el[`_${attr}`] = val;

	el[attr] = val;
};

/**
 * Rewrite an element
 * @param {Element} - The element to rewrite
 * @param {String=} - If it is an attribute that is being rewritten
 */
$aero.rewrite = async (el, attr) => {
	// Don't exclusively rewrite attributes or check for already observed elements
	const isNew = typeof attr === "undefined";

	if (isNew && typeof el.observed !== "undefined") return;

	const tag = el.tagName.toLowerCase();

	// CSP Testing
	function allow(dir) {
		if ($aero.config.flags.corsEmulation) return true;

		if ($aero.checkCsp(dir)) {
			el.remove();
			return false;
		}

		return true;
	}

	// TODO: Finish CSP emulation
	if (isNew && tag === "script" && !el.rewritten) {
		if (el.src) $aero.set(el, "src", $aero.rewriteHtmlSrc(el.src));
		if (
			typeof el.innerHTML === "string" &&
			el.innerHTML !== "" &&
			// Make sure the script has a js type
			(el.type === "" ||
				el.type === "text/javascript" ||
				el.type === "application/javascript")
		) {
			$aero.set(
				el,
				el.innerHTML,
				$aero.safeText($aero.scope(el.innerText))
			);

			// The inline code is read-only, so the element must be cloned
			const cloner = new $aero.Cloner(el);

			cloner.clone();
			cloner.cleanup();
		}
	} else if ((tag === "a" || tag === "area") && el.href)
		$aero.set(el, "href", $aero.rewriteHtmlSrc(el.href));
	else if (
		tag === "form" &&
		// Don't rewrite again
		!el._action &&
		// Action is automatically created
		el.action !== null
	)
		$aero.set(el, "action", $aero.rewriteHtmlSrc(el.href));
	else if (tag === "iframe") {
		if (el.csp) $aero.set(el, "csp", rewriteCSP(el.csp));

		if (el.src && allow("frame-src")) {
			// Embed the origin the origin as an attribute, so that the frame can reference it to do its checks
			/// TODO: Conceal this
			el.parentProxyOrigin = $aero.proxyLocation.origin;

			// Inject aero imports if applicable then rewrite the Src
			$aero.set(
				el,
				"src",
				$aero.rewriteHtmlSrc(
					el.src.replace(/data:text\/html/g, "$&" + $aero.imports)
				)
			);
		}
		if (el.srcdoc)
			// Inject aero imports
			$aero.set(el, "srcdoc", $aero.imports + el.srcdoc);
		if (el.allow)
			// TODO: Emulate Permissions policy using $aero.cors.perms
			null;
	} else if (tag === "portal" && el.src)
		$el.set(el, "src", $aero.rewriteHtmlSrc(el.src));
	else if (tag === "meta") {
		switch (el.httpEquiv) {
			case "content-security-policy":
				$aero.set(el, "content", $aero.rewriteCSP(el.content));
				break;
			case "refresh":
				$aero.set(
					el,
					"content",
					el.content.replace(
						/^([0-9]+)(;)(\s+)?(url=)(.*)/g,
						(_match, g1, g2, g3, g4, g5) =>
							g1 + g2 + g3 + g4 + $aero.rewriteSrc(g5)
					)
				);
		}
	} else if (tag === "link" && tag.rel === "manifest") {
		$aero.set(el, "href", $aero.rewriteSrc(el.href));
	} else if ($aero.config.flags.legacy && tag === "html") {
		// Cache manifests
		$aero.set(el, "manifest", $aero.rewriteSrc(el.manifest));
	}

	if (isNew && "integrity" in el && el.integrity !== "") {
		const cloner = new $aero.Cloner(el);

		cloner.clone();
		cloner.cleanup();
	}

	el.observed = true;
};
