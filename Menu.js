{
	let buttons = {};
	let contents = {};
	let active_button = void 0;
	let active_content = void 0;
	
	let input_is_locked = false;
	let shackle_locked = document.getElementById("shackle_locked");
	let shackle_unlocked = document.getElementById("shackle_unlocked");
	
	let submenu = document.getElementById("submenu");
	let submenu_is_visible = false;
	let clicked_button_submenu = false;
	
	let files_input = document.getElementById("files");
	let reader = new FileReader();
	let loading = document.getElementById("loading");
	let filename = "";
	
	let menu = document.getElementById("menu"); 
	let spacer = document.getElementById("menu_spacer");
	
	// Changes the visible content
	let ChangeContent = function(button, content)
	{
		active_button && RemoveClass(active_button, "active");
		active_content && AddClass(active_content, "hide");
		button && AddClass(button, "active");
		content && RemoveClass(content, "hide");
		active_button = button;
		active_content = content;
	};
	
	// Get all the buttons
	for(let i=0, tmp=document.querySelectorAll("#menu li, #submenu li"); i<tmp.length; ++i) 
		buttons[tmp[i].id.slice(7)] = tmp[i];
	
	// Get all content
	for(let i=0, tmp=document.querySelectorAll("div.content"); i<tmp.length; ++i) 
		contents[tmp[i].id.slice(8)] = tmp[i];
	
	// Navigation buttons
	buttons.groupinp.addEventListener("click", function(){ ChangeContent(buttons.groupinp, contents.groupinp ); });
	buttons.positive.addEventListener("click", function(){ ChangeContent(buttons.positive, contents.sociogram); Sociogram.Draw(1); });
	buttons.negative.addEventListener("click", function(){ ChangeContent(buttons.negative, contents.sociogram); Sociogram.Draw(0); });

	// Lock or unlock button
	buttons.lock.addEventListener("click", function()
	{
		input_is_locked = !input_is_locked;
		shackle_locked.  setAttribute("visibility" , input_is_locked? "visible" : "hidden");
		shackle_unlocked.setAttribute("visibility" , input_is_locked? "hidden"  : "visible");
		GroupInput.SetLocked(input_is_locked);
		Sociogram.SetLocked(input_is_locked);
	});
	
	// Button to open or close the submenu
	buttons.submenu.addEventListener("click", function(){ clicked_button_submenu = true; });
	document.addEventListener("click", function()
	{
		if(!clicked_button_submenu && !submenu_is_visible) return;
		submenu_is_visible = !ToggleClass(submenu, "hide");
		clicked_button_submenu = false;
	});
	
	// The new button clears all data
	buttons.new.addEventListener("click", function()
	{ 
		if(confirm("Alle wijzigingen zullen verloren gaan.") !== true) return;
		Group.Clear();
		GroupInput.UpdateForm();
		input_is_locked && buttons.lock.click(); // Unlock the input
		Sociogram.Update();
		buttons.groupinp.click();
	});
	
	// Import data button
	buttons.import_data.addEventListener("click", function()
	{
		if(confirm("Alle wijzigingen zullen verloren gaan.") !== true) return;
		files_input.click();
	});
	
	files_input.addEventListener("change", function()
	{
		if(!files_input.files.length) return;
		RemoveClass(loading, "hide");
		filename = files_input.files[0].name;
		reader.readAsText(files_input.files[0]);
	});
	
	reader.addEventListener("load", function()
	{
		let data = JSON.parse(window.atob(reader.result.replace(/((#.*)|(\r\n|[\n\r\u2028\u2029])|\s*)/g, "")));
		data[0] != input_is_locked && buttons.lock.click(); // Restore the input lock state
		Group.SetData(data[1]);
		GroupInput.UpdateForm();
		Sociogram.Update();

		AddClass(loading, "hide");
	});
	
	reader.addEventListener("error", function()
	{
		AddClass(loading, "hide");
		alert("Error opening " + filename);n
	});
	
	// Encodes the sociogram data
	let EncodeData = function(){ return window.btoa(JSON.stringify([input_is_locked, Group.GetData()])); };
	
	// Export data button
	buttons.export_data.addEventListener("click", function()
	{ 
		let date = new Date();
		let endl = "\r\n";
		let header = "# Sociogram" + endl 
				   + "# " + date.toLocaleString() + endl 
				   + "# " + Group.GetDescription().replace(/(\r\n|[\n\r\x85\u2028\u2029])/g, ", ") + endl;
		let data = "";
		
		for(let i=0, str = EncodeData(); i<str.length; i+=80)
			data += str.slice(i, Math.min(i + 80, str.length)) + endl;
		
		filename = filename || "sociogram.txt";
		let r = saveAs(new Blob([header+data], {type: "text/plain;charset=utf-8"}), filename);
		//console.log(r);
		
		//console.log(header+data);
	});
	
	buttons.export_sociogram.addEventListener("click", function()
	{ 
		Sociogram.CreatePDF().save("sociogram.pdf");
		//Sociogram.CreatePDF().output("dataurlnewwindow", "why.pdf");
	});
	
	
	
	// Adjusts the spacer height to match the menu height
	let UpdateSpacer = function(){ spacer.style.height = menu.offsetHeight + "px"; };
	
	window.addEventListener("resize", UpdateSpacer);
	UpdateSpacer();
	
	
	buttons.groupinp.click();
}



























































































