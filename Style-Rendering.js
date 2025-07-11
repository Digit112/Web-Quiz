class MarkDown {
	// Parse the passed string as markdown.
	// This accepts the following tokens:
	// Bold Delimiter: **
	// Italics Delimiter: *
	// Code Delimiter: `
	// Think of a delimiter as toggling a flag which denotes the presence of its associated effect.
	constructor(str, token_map) {
		if (!(token_map instanceof Map))
			throw new Error("token_map must be Map")
		
		for (let token of token_map.keys()) {
			if (token.length == 0)
				throw new Error("Tokens must not be empty string.")
		}
		
		// An array of pairs. Each of a string and a Set of tags which apply to that string.
		this.segments = []
		
		let tok_data = MarkDown.get_next_token(str)
		let current_tags = new Set()
		while (tok_data[0] != -1) {
			console.assert(tok_data[1] != null)
			
			let token_i = tok_data[0]
			let token = tok_data[1]
			let tag = token_map.get(token)
			
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
			
			tok_data = MarkDown.get_next_token(str)
		}
		
		// Any active tags are unclosed and should be retroactively removed.
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
	
	// Retrieve the first token in the string.
	// Returns the index of the first character in the token and the token itself in an array.
	// Returns [-1, null] if no token was found.
	static get_next_token(str, token_map) {
		let first_token = null
		let first_token_i = -1
		
		let cursor = 0
		while (true) {
			// Get the first token.
			for (let token of token_map) {
				console.assert(token.length > 0)
				
				let i = str.indexOf(token, cursor)
				while (i != -1) {
					if (i != -1) {
						if (first_token == null || i < first_token_i) {
							first_token = token
							first_token_i = i
						}
					}
				}
			}
			
			// Check that the token is not escaped.
			// This arrangement ensures that a construct such as \** is interpreted as
			// an escaped bold token rather than escaped and unescaped pair of italics tokens
			if (first_token_i > 0 && str[first_token_i - 1] == "\\") {
				first_token = null
				first_token_i = -1
				
				cursor = first_token_i + first_token.length
			}
			else {
				break
			}
		}
		
		return [first_token_i, first_token]
	}
}