var GroupInput = {};

{
	let is_locked = false;
	let input_description = document.getElementById("group_description");
	let input_n = document.getElementById("number_of_persons");
	let fieldset_persons = document.getElementById("persons");
	let table_persons_list = document.getElementById("persons_list");
	let resize_message = "Sommige gegevens zullen verloren gaan.";
		
	let UpdateNamelist = function()
	{
		let n_persons = Group.GetSize();
		let CreateInputName = function(n, fn)
		{
			let func = fn? Group.SetFirstName : Group.SetLastName;
			let inp = document.createElement("input");
			inp.id = (fn?"first":"last") + "_name_"+n;
			inp.value = fn? Group.GetFirstName(n) : Group.GetLastName(n);
			inp.disabled = is_locked;
			inp.autocomplete = "off";
			inp.type = "text";
			inp.addEventListener("change", function(e){ func(n, e.target.value); });
			return inp;
		}
		let CreateInputGender = function(n, g)
		{	
			let inp = document.createElement("input");
			inp.id = "gender_"+g+"_"+n;
			inp.type = "radio";
			inp.name = "gender_"+n;
			inp.value = g;
			inp.checked = Group.GetGender(n) == g;
			inp.disabled = is_locked;
			inp.autocomplete = "off";
			let before = inp.checked;
			inp.addEventListener("change", function(e){ if(e.target.checked) Group.SetGender(n, g); });
			inp.addEventListener("mousedown", function(e){ before = e.target.checked; });
			inp.addEventListener("click", function(e){ if(before != e.target.checked) return; e.target.checked=false; Group.SetGender(n, "u"); });
			return inp;
		}	
		
		while(table_persons_list.rows.length > 1) table_persons_list.deleteRow(-1);
		for(let i=table_persons_list.rows.length-1; i<n_persons; ++i)
		{
			let row = table_persons_list.insertRow(-1);
			row.insertCell(-1).appendChild(document.createTextNode((i+1)+"."+String.fromCharCode(160)));
			row.insertCell(-1).appendChild(CreateInputName(i, true));
			row.insertCell(-1).appendChild(CreateInputName(i, false));
			row.insertCell(-1).appendChild(CreateInputGender(i, "m"));
			row.insertCell(-1).appendChild(CreateInputGender(i, "f"));
		}
		(n_persons? RemoveClass : AddClass)(fieldset_persons, "hide");
	};
	
	input_description.addEventListener("change", function(){ Group.SetDescription(input_description.value);	});
	
	input_n.addEventListener("change", function()
	{
		let n = parseInt(input_n.value);
		let do_not_change = !/^[0-9]+$/.test(input_n.value) /* Valid input? */ || Group.ResizingWillTruncateData(n) /* Data loss? */ && !confirm(resize_message) /* User minds data loss? */;
		
		if(do_not_change) input_n.value = Group.GetSize().toString(); // Restore the value
		if(do_not_change || n == Group.GetSize()) return; // Do not change anything
		
		Group.Resize(n);
		UpdateNamelist();
	});
	
	GroupInput.SetLocked = function(f)
	{
		let inputs = document.querySelectorAll("#content_groupinp input");
		is_locked = f;
		
		for(let i=0; i<inputs.length; ++i)
			inputs[i].disabled = is_locked;
	};
	
	GroupInput.UpdateForm = function()
	{
		input_description.value = Group.GetDescription();
		input_n.value = Group.GetSize().toString();
		UpdateNamelist();	
	};
}

















































