// Returns true if the element ele has the class cls or false otherwise.
function HasClass(ele, cls)
{
	let reg = new RegExp("(?:^|\\s+)" + cls + "(?:$|\\s+)");
	return reg.test(ele.className);
}

// Removes the class cls from element ele. 
// Return true if it removed the class and false otherwise.
function RemoveClass(ele, cls)
{
	let flg = false;
	let reg = new RegExp("(^|\\s+)" + cls + "(?:$|\\s+)", "g");
	let rep = function(match, p){ flg = true; return p.length && match.length - cls.length > p.length ? " " : ""; };
	ele.className = ele.className.replace(reg, rep);
	return flg;
}

// Adds the class cls to element ele.
// Returns true if it added the class and false otherwise
function AddClass(ele, cls)
{
	let reg = new RegExp("(?:^|\\s+)" + cls + "(?:$|\\s+)");
	return !reg.test(ele.className) && (ele.className += " " + cls, true);
}

// Toggles the class cls to element ele.
// Returns true if it added the class and false if it removed the class.
function ToggleClass(ele, cls){ return AddClass(ele, cls) || !RemoveClass(ele, cls); };
