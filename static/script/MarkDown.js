class MarkDown {
	static default_token_map = new Map([["**", "b"], ["*", "i"], ["__", "u"], ["`", "code"]])
	
	// Parse the passed string as markdown using the provided map from tokens onto the HTML tags they toggle.
	// Think of a delimiter as toggling a flag which denotes the presence of its associated effect.
	constructor(str, token_map=MarkDown.default_token_map) {
		if (!(str instanceof String || typeof str == "string"))
			throw new Error("'str' must be string.")
		
		if (!(token_map instanceof Map))
			throw new Error("token_map must be Map")
		
		for (let token of token_map.keys()) {
			if (token.length == 0)
				throw new Error("Tokens must not be empty string.")
		}
		
//		console.log("Attempting to parse '" + str + "'")
		
		this.token_map = token_map
		
		// An array of pairs. Each of a string and a Set of tags which apply to that string.
		this.segments = []
		
		let tok_data = MarkDown.get_next_token(str, token_map)
		let current_tags = new Set()
		let num_iters = 0
		while (tok_data[0] != -1) {
			num_iters++
			if (num_iters > 100)
				throw new Error("Iter limit reached.")
			
			console.assert(tok_data[1] != null)
			
			let token_i = tok_data[0]
			let token = tok_data[1]
			let tag = token_map.get(token)
			
//			console.log("Token '" + token + "' at " + tag + ".")
			
			if (token_i > 0) {
				// Push a portion of the string and the current tag list to the segments array.
				this.segments.push([
					str.slice(0, token_i),
					new Set(current_tags)
				])
			}
			
			// Update the string and tag set
			str = str.slice(token_i + token.length)
			if (current_tags.has(tag)) current_tags.delete(tag)
			else current_tags.add(tag)
			
			tok_data = MarkDown.get_next_token(str, token_map)
		}
		
		// Technically it makes no sense to push these tags since there are no
		// remaining tokens and thus, all tags open are unclosed and will be removed in the next step.
		// However, since this push might not even occur if the str is length 0, these tags must
		// be pushed to allow the removal step proceed correctly.
		if (str.length > 0) {
			this.segments.push([
				str,
				new Set(current_tags)
			])
		}
		
		// Any active tags are unclosed and should be retroactively removed.
		for (let segment_i = this.segments.length - 1; segment_i >= 0; segment_i--) {
			let segment = this.segments[segment_i]
			
			for (let tag of current_tags) {
				if (segment[1].has(tag)) {
					segment[1].delete(tag)
				}
				else {
					current_tags.delete(tag)
				}
			}
		}
		
		this.cull_escaping_slashes()
		
		this.length = 0
		for (let segment of this.segments) this.length += segment[0].length
		
//		console.log("Parsing Complete")
	}
	
	// Returns a span node containing the result of parsing the markdown.
	// TODO: Consider caching rendered value.
	as_html() {
		let root = document.createElement("span")
		let open_node_stack = new Map()
		
		for (let segment of this.segments) {
//			console.log("Rendering '" + segment[0] + "'")
			let leaf = root
			let has_broken_chain = false
			
			for (let tag of this.token_map.values()) {
				// We need this tag.
				if (segment[1].has(tag)) {
					// This tag or an ancestor was not open.
					if (!open_node_stack.has(tag) || has_broken_chain) {
						has_broken_chain = true
						leaf = leaf.appendChild(document.createElement(tag))
						open_node_stack.set(tag, leaf)
					}
					// This tag and all ancestors are open.
					else {
						leaf = open_node_stack.get(tag)
					}
				}
				// We must exclude this tag.
				else {
					// This tag is open
					if (open_node_stack.has(tag)) {
						has_broken_chain = true
						
						// Close the tag
						open_node_stack.delete(tag)
					}
				}
			}
			
			let content = document.createElement("text")
			content.textContent = segment[0]
			leaf.appendChild(content)
		}
		
		return root
	}
	
	// Simpler render function.
	// This function has no ability to concatenate node like the above down.
	// The concatenation is likely to introduce bugs and has no benefit, except to make the output much prettier.
	// render() {
		// for (let segment of this.segments) {
			// if (segment[1].size == 0) {
				// let leaf = document.createElement("text")
				// leaf.textContent = segment[0]
				// root.appendChild(leaf)
			// }
			// else {
				// let leaf = root
				// for (let tag of segment[1]) {
					// leaf = leaf.appendChild(document.createElement(tag))
				// }
			
				// leaf.textContent = segment[0]
			// }
		// }
		
		// return root
	// }
	
	// Returns the text with annotations excluded.
	as_text() {
		return this.segments.map((segment) => segment[0]).join("")
	}
	
	toString() {
		return this.as_text()
	}
	
	// Apply a tag to the characters in the specified range.
	add_tag(tag, start, end) {
		if (end <= start)
			throw new Error("start index must be less than end index.")
		
		if (end < 0)
			throw new Error("end index must be positive")
		
		if (start < 0)
			throw new Error("start index must be positive")
		
		for (let i = 0; i < this.segments.length; i++) {
			let segment = this.segments[i]
//			console.log(i + ": " + "'" + segment[0] + "', " + start + ", " + end)
			
			// This segment contains the start.
			if (start > 0 && start < segment[0].length) {
//				console.log("Contains Start...")
				// Split the text
				let left_str = this.segments[i][0].slice(0, start)
				let right_str = this.segments[i][0].slice(start)
				
				// Split this segment in two and tag the right half.
				
				this.segments.splice(i+1, 0, [
					right_str,
					new Set(this.segments[i][1]) // Copy the tags
				])
				
				this.segments[i][0] = left_str
			}
			// This segment is past the start.
			else if (start <= 0) {
				// This segment is before the end
				if (end >= segment[0].length) {
					this.segments[i][1].add(tag)
				}
				// This segment contains the end
				else if (end > 0 && end < segment[0].length) {
					// Split the text
					let left_str = this.segments[i][0].slice(0, end)
					let right_str = this.segments[i][0].slice(end)
					
					// Split this segment in two and tag the left half.
					
					this.segments.splice(i+1, 0, [
						right_str,
						new Set(this.segments[i][1]) // Copy the tags
					])
					
					this.segments[i][0] = left_str
					this.segments[i][1].add(tag)
					
					break
				}
				// This segment is past the end
				else {
//					console.log("Past End...")
					break
				}
			}
			
			// Track the relative start and end.
			start -= this.segments[i][0].length
			end -= this.segments[i][0].length
		}
	}
	
	// Removes all backslashes which escape tokens or other backslashes.
	cull_escaping_slashes() {
		for (let i = 0; i < this.segments.length; i++) {
			let segment = this.segments[i][0]
			let new_segment = ""
			
			let cursor = 0
			let next_slash = segment.indexOf("\\")
			let num_iters = 0
			while (next_slash < segment.length - 1 && next_slash != -1) {
				num_iters++
				if (num_iters > 256)
					throw new Error("Iteration Limit Reached")
				
				// Is escaped backslash. Keep only the escaping slash.
				// Cursor is moved to after the escaped slash.
				if (segment[next_slash+1] == "\\") {
					new_segment += segment.slice(cursor, next_slash+1)
					
					cursor = next_slash + 2
				}
				else {
					let is_escaped_token = false
					for (let token of this.token_map.keys()) {
						// Is escaped text. Omit the slash. Cursor is moved to the first character of the token.
						if (segment.startsWith(token, next_slash+1)) {
							new_segment += segment.slice(cursor, next_slash)
							
							is_escaped_token = true
							break
						}
					}
					
					// Not an escaped token paste all text including the slash.
					if (!is_escaped_token) {
						new_segment += segment.slice(cursor, next_slash+1)
					}
					
					cursor = next_slash + 1
				}
				
				next_slash = segment.indexOf("\\", cursor)
			}
			
			this.segments[i][0] = new_segment + segment.slice(cursor)
		}
	}
	
	debug_segments() {
		for (let segment of this.segments) {
			let str = segment[0]
			let tags = segment[1]
			
			let debug_str = "'" + str + "': "
			for (let key of tags) debug_str += key + ", "
			
			console.log(debug_str)
		}
	}
	
	static from(source) {
		if (!(source instanceof MarkDown))
			throw new Error("'source' must be a MarkDown.")
		
		let new_md = new MarkDown("")
		new_md.segments = []
		for (let segment of source.segments) {
			new_md.token_map = source.token_map
			new_md.segments.push([segment[0], new Set(segment[1])])
		}
		
		return new_md
	}
	
	// Retrieve the first token in the string.
	// Returns the index of the first character in the token and the token itself in an array.
	// Returns [-1, null] if no token was found.
	static get_next_token(str, token_map) {
		let first_token = null
		let first_token_i = -1
		
//		console.log("Getting token from '" + str + "'")
		
		let cursor = 0
		let num_iters = 0
		while (true) {
			num_iters++
			if (num_iters >= 100)
				throw new Error("Iteration limit reached.")
			
			// Get the first token.
			for (let token of token_map.keys()) {
				// Failure of this assertion can cause infinite loop (if it weren't for the iter limit)
				console.assert(token.length > 0)
				
				let i = str.indexOf(token, cursor)
//				console.log("Searching for token '" + token + "' from " + cursor + ", got " + i)
				if (i != -1) {
					if (first_token == null || i < first_token_i) {
						first_token = token
						first_token_i = i
					}
				}
			}
			
			// Check that the token is not escaped.
			// This arrangement (Check for all tokens then check for escaped-ness) ensures that a construct such as \** is interpreted as
			// an escaped bold token rather than escaped and unescaped pair of italics tokens
			if (first_token_i != -1 && MarkDown.is_escaped(str, first_token_i)) {
//				console.log("Token '" + first_token + "' is escaped.")
				cursor = first_token_i + first_token.length
				
				first_token = null
				first_token_i = -1
			}
			else {
				break
			}
		}
		
		return [first_token_i, first_token]
	}
	
	// Returns true if the character at the passed index is escaped.
	static is_escaped(str, char_i) {
		// Note that char_i can be the string length, this returns whether an appended character would be escaped...
		if (char_i < 0 || char_i > str.length)
			throw new Error("Index must be positive and must not be greater than string length.")
		
		let is_escaped = false
		for (let i = char_i-1; i >= 0 && str[i] == "\\"; i--) is_escaped = !is_escaped
		
		return is_escaped
	}
}

// let md = new MarkDown("none**bold*bolditalic**italic`itco*de`trail")
// new MarkDown("**unclosedbold*uncloseditalic").debug_segments()
// new MarkDown("**unclosedbold*closeditalic*trail").debug_segments()
// new MarkDown("**closedbold**none**unclosedbold*closeditalic*").debug_segments()
// new MarkDown("**bold\\**bold**none*italics\\*italics*").debug_segments()
// md.add_tag("u", 3, 9)
// md.debug_segments()