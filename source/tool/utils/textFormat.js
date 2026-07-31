export function styleText(style, text) {
	switch (style) {
		case 'r': style = 'color:#ff4343'; break;	// 极难
		case 'g': style = 'color:#98fb98'; break;	// 易
		case 'b': style = 'color:LightBlue'; break; // 较易
		case 'y': style = 'color:Yellow'; break;	// 中
		case 'o': style = 'color:Orange'; break;	// 较难
		case 'p': style = 'color:Pink'; break;		// 难
		case 'O': style = 'opacity:0.5'; break;
	}
	return `<span style='${style}'>${text}</span>`;
}
