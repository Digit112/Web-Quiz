function lerp(a, b, t) {
	return (b - a) * t + a
}

// Event Listener for checkboxes that select questions.
function check_event() {
	this.question_group.is_enabled = this.checked
	
	if (this.checked) {
		this.question_group.check_all_descendents()
		this.did_recurse_last = false
	}
	else {
		this.question_group.reset_all_descendents()
		
		if (this.question_group.get_enabled()) {
			// Quick failsafe against the possibility of infinite recurse, since the last statement below results in this callback being called again.
			if (this.did_recurse_last) {
				throw new Error("Deja vu (disabled this node and all ancestors yet the node is still enabled. This should be impossible.)")
			}
			this.did_recurse_last = true
				
			// Unchecked a box with a checked ancestor. We must also uncheck all anceestors.
			// All ancestors of this node will propogate their status to their children,
			// except other ancestors of this node, which will all be disabled.
			this.question_group.parent_group.propogate_and_disable()
			
			// The above call would have re-enabled this question (and all its siblings, and the siblings of all descendants of enabled ancestors!)
			// So we must re-disable it.
			this.question_group.disable_and_uncheck()
		}
		else {
			this.did_recurse_last = false]
		}
	}
}

// Event Listener for buttons that control the collapsibles.
function collapsible_event() {
	this.classList.toggle("active");
	let content = this.parentElement.nextElementSibling
	
	// Toggle display of following block.
	if (content.style.display === "block") {
		content.style.display = "none"
		this..innerHTML = "+"
	}
	else {
		content.style.display = "block"
		this..innerHTML = "-"
	}
}

import "Question.js";
import "QuestionGroup.js";
import "Library.js"

