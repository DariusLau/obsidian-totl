import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	setIcon,
} from "obsidian";

const { Fcal } = require("fcal");
const numeral = require("numeral");

interface TotlPluginSettings {
	mySetting: string;
	precision: number;
}

const DEFAULT_SETTINGS: TotlPluginSettings = {
	mySetting: "default",
	precision: 2,
};

export default class TotlPlugin extends Plugin {
	settings: TotlPluginSettings;

	async onload() {
		await this.loadSettings();

		console.log("obsidian-totl loaded");
		// TODO
		// - [x] Add heading formatting
		// - [x] Add comment formatting
		// - [x] Add copy number to cliipboard on click
		// - [ ] Add copy entire mage to clipboard on button
		// - [ ] Add insert solve block on command palette
		// - [ ] Add insert solve block on sidebar
		// - [ ] Add Decimal currency config
		// - [x] Add precision config
		// - [ ] Separate left and right layout so selection only copies left col
		// - [ ] Slideable divider?
		// - [x] Light mode and dark mode support
		// - [ ] Add propper support for 'x' as number multiplier
		// - [ ] Test operations with large numebrs e7 (10,000,000 * 10,000,000)
		// - [ ] Rewrite parsing structure for a more readable logic

		// Parsing Structure
		// Find formattingKeywords
		//   Add nodes object with formatting
		// Find keywords and split arguments.
		//  A. If keyword do not eval add node with formatting
		//  B. Split by spaces
		//      For each fragment
		//        If contains numbers run through numeral
		//        Attempt fcal eval of replaced numeral values to calculate row value
		//        If variable or reserved word from env split add formatting to node
		//        Else append row value without formatting
		//        Add unit of row
		//        If position [1] from fragments exists append node with heading or comment formatting

		// row = {
		//  "raw": "var = 1,200 km // Comment",
		//  "fragments": ["var = 1,200km", "// Comment"],
		//  "fragmentsNumeral": ["var = 1200", "// Comment"],
		//  "fcalValue": fcalObject,
		//  "value": "1200",
		//  "nodes": [{nodeWithFormatting}],
		//  "rowUnit": "km",
		// }

		this.registerMarkdownCodeBlockProcessor("totl", (source, el, ctx) => {
			const container = el.createEl("div", { cls: "totl-container" });

			// Create a top row that will display our image copy paste button
			const topRow = container.createEl("div", {
				cls: "totl-row-container totl-heading-row",
			});

			// WIP: Copy image to clipboard - start
			// const copyPasteButton = topRow.createEl("div", {
			//   cls: "code-block-flair totl-copy-paste",
			// });
			// const item = copyPasteButton.createEl("div");
			// setIcon(item, "copy");

			// this.registerDomEvent(copyPasteButton, "click", (evt: MouseEvent) => {
			//   navigator.clipboard.writeText("Test").then(
			//     () => {
			//       /* clipboard successfully set */
			//       new Notice("Copied solve image to clipboard");
			//     },
			//     () => {
			//       new Notice("Copy Paste not supported");
			//     },
			//   );
			// });
			// WIP: Copy image to clipboard - end

			const fcal = new Fcal();
			const precision = this.settings.precision;

			// Solve inline keywords, precedence defined by asc order in array
			const keyWords = [
				{ value: "//", cls: "totl-comment" },
				{ value: "#", cls: "totl-heading" },
			];
			const formattingKeywords = [{ value: "---", cls: "totl-divider" }];
			const debug = false;
			var fcalTest = fcal.evaluate("5156156 + 6156156");
			console.log("fcalTest", fcalTest);
			// var fcalTest = fcal.evaluate("EMPRESASRE = 1293");
			console.log("fcalTest", fcalTest.toFormat());

			function fcalToFloat(fcal) {
				console.log("fcalToFloat", fcal, fcal.toFormat());
				var numInDecimal = null;
				// if (fcal.n.d[1] !== undefined) {
				//   numInDecimal = fcal.n.d[0] + "." + fcal.n.d[1];
				//   // numInDecimal = Number.parseFloat(numInDecimal).toFixed(precision);
				// } else {
				//   numInDecimal = fcal.n.d[0];
				// }
				numInDecimal = numeral(fcal.toFormat()).value();

				// console.log("numeral", numeral(numInDecimal).format("0,0"));
				// console.log("numeral", numeral(numInDecimal).format("0.0"));
				// console.log("fcalToFloat", numInDecimal);
				return numInDecimal;
			}

			// Results array stores an object for every row, including its string, value and fcalValue
			const results = [];
			const rows = source.split("\n");

			// Parse rows and store results in results arr
			for (let i = 0; i < rows.length; i++) {
				var value = null;
				var calc = rows[i];
				var fcalValue = null;
				var nodes = null;

				if (rows[i].length > 0) {
					// Evaluate if "TOTAL" string is contained in row
					// if true calculate TOTAL var value based on previous rows
					if (rows[i].includes("TOTAL")) {
						var total = 0;
						// Evaluate backwards from current row -1 until value is empty
						for (let j = i - 1; j >= 0; j--) {
							if (
								results[j].readableNumber !== "" &&
								results[j].readableNumber !== null &&
								results[j].readableNumber !== undefined
							) {
								total = fcalToFloat(
									fcal.evaluate(
										total +
											" + " +
											numeral(
												results[j].calculation,
											).value(),
									),
								);
							} else {
								j = 0;
							}
						}
						// Replace TOTAL string with total variable calculation
						calc = rows[i].replace("TOTAL", total);
					}

					// Truncate calculation row before keyword if there is a keyword match
					keyWords.forEach((keyWord) => {
						if (calc.includes(keyWord.value)) {
							calc = calc.split(keyWord.value)[0];
						}
					});

					try {
						// Pass on float value and fcalValue for formatting and data type
						console.log("eval calc", calc);
						fcalValue = fcal.evaluate(calc);
						console.log("calc", calc, value, fcalValue);
						value = fcalToFloat(fcalValue);
						// console.log(value, fcalValue);
					} catch (e) {
						//If fcal string as is evaluation failed, attempt to run value through numeral and fcal
						// This fixes large numbers separated by commas
						try {
							// Pass on float value and fcalValue for formatting and data type
							calc = numeral(calc).value().toString();
							value = fcalToFloat(fcal.evaluate(calc));
							fcalValue = fcal.evaluate(calc);
						} catch (e) {
							// Number not parseable show empty row
							console.log("second parse failed", e);
							console.log(e);
						}
						console.log("first parse failed", e);
					}
				} else {
					value = "";
				}

				// Add formatting to variables
				var env = fcal.getEnvironment().values;
				// Manually add "TOTAL" as a variable name as well as keywords for propper split of string
				env.set("TOTAL");
				env.set("#");
				env.set(`//`);

				console.log("env", env);

				// Set default string node, it will be overwritten if there is a
				// keyword, variable or formattingKeyword match
				nodes = [{ nodeType: "span", cls: "", text: rows[i] }];

				// Replace in the row string all occurrences of variable names
				var nodesString = rows[i];

				env.forEach((value, key) => {
					nodesString = nodesString.replaceAll(key, "|" + key + "|");
				});

				const nodesArray = nodesString.split("|");
				console.log(
					"nodeString",
					nodesString,
					"nodesArray",
					nodesArray,
				);

				// Overwrite default node and add formatting if it contains variables
				if (nodesArray.length > 1) {
					nodes = [];
					nodesArray.forEach((node) => {
						if (node !== "") {
							console.log("node ->", node);
							if (env.has(node)) {
								nodes.push({
									nodeType: "span",
									cls: "totl-variable",
									text: node,
								});
							} else {
								nodes.push({
									nodeType: "span",
									cls: "",
									text: node,
								});
							}
							console.log("🟥 nodes", nodes);
						}
					});
				}

				// Loop through all nodes and evaluate if it contains a keyword
				// If there is a match replace all nodes after the keyword
				nodesArray.forEach((node, m) => {
					keyWords.forEach((keyWord) => {
						if (node == keyWord.value) {
							// Replace nodes variable with existing nodes up to keyword match
							// const precedingNodes = nodes.slice(0, m - 1);
							const precedingNodes = nodes.slice(0, m);
							nodes = [...precedingNodes];
							console.log(
								"nodes",
								nodes,
								"precedingNodes",
								precedingNodes,
								m,
							);

							// Flatten all remaining nodes while trimming spaces to avoid double space in join
							const remainingNodes = nodesArray
								.slice(m, nodesArray.length)
								.map((str) => str.trim())
								.flat();

							nodes.push({
								nodeType: "span",
								cls: keyWord.cls,
								text: remainingNodes.join(" "),
							});
						}
					});
				});

				formattingKeywords.forEach((formattingKeyword) => {
					if (
						nodes.length == 1 &&
						nodes[0].text !== undefined &&
						nodes[0].text.includes(formattingKeyword.value)
					) {
						nodes = [
							{
								nodeType: "div",
								cls: formattingKeyword.cls,
								text: "",
							},
						];
					}
				});

				results[i] = {
					originalString: rows[i],
					readableNumber: numeral(value).value(),
					calculation: calc,
					fcalValue: fcalValue,
					nodes: nodes,
					env: env,
				};
			}
			console.log(results);

			// Render the block with our results
			for (let j = 0; j < results.length; j++) {
				const rowDiv = container.createEl("div", {
					cls: "totl-row-container",
				});

				const leftContainer = rowDiv.createEl("div", {
					cls: "totl-row-left-container",
				});

				results[j].nodes.forEach((element) => {
					leftContainer.createEl(element.nodeType, {
						cls: element.cls,
						text: element.text,
					});
				});

				const rightContainer = rowDiv.createEl("div", {
					cls: "totl-row-right-container",
				});

				var formattedValue = results[j].readableNumber;
				if (formattedValue !== null) {
					// Add number formatting and remove trailing zeroes
					formattedValue = numeral(results[j].readableNumber)
						.format("0,0." + precision)
						.replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1");

					if (results[j].fcalValue.unit !== undefined) {
						formattedValue +=
							" " + results[j].fcalValue.unit.unitType;
					}
				}

				const rightResultEl = rightContainer.createEl("div", {
					cls: "totl-right-result",
					text: formattedValue,
				});

				// Bind an onclick event for right hand results
				this.registerDomEvent(
					rightResultEl,
					"click",
					(evt: MouseEvent) => {
						navigator.clipboard
							.writeText(evt.target.childNodes[0].textContent)
							.then(
								() => {
									/* clipboard successfully set */
									new Notice("Copied to clipboard");
								},
								() => {
									new Notice("Copy Paste not supported");
								},
							);
					},
				);
			}
		});

		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon(
		//   "dice",
		//   "Sample Plugin",
		//   (evt: MouseEvent) => {
		//     // Called when the user clicks the icon.
		//     new Notice("This is a notice!");
		//   },
		// );
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass("my-plugin-ribbon-class");

		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// // const statusBarItemEl = this.addStatusBarItem();
		// // statusBarItemEl.setText("Status Bar Text");

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		//   id: "open-sample-modal-simple",
		//   name: "Open sample modal (simple)",
		//   callback: () => {
		//     new SampleModal(this.app).open();
		//   },
		// });
		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		//   id: "sample-editor-command",
		//   name: "Sample editor command",
		//   editorCallback: (editor: Editor, view: MarkdownView) => {
		//     console.log(editor.getSelection());
		//     editor.replaceSelection("Sample Editor Command");
		//   },
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		//   id: "open-sample-modal-complex",
		//   name: "Open sample modal (complex)",
		//   checkCallback: (checking: boolean) => {
		//     // Conditions to check
		//     const markdownView =
		//       this.app.workspace.getActiveViewOfType(MarkdownView);
		//     if (markdownView) {
		//       // If checking is true, we're simply "checking" if the command can be run.
		//       // If checking is false, then we want to actually perform the operation.
		//       if (!checking) {
		//         new SampleModal(this.app).open();
		//       }

		//       // This command will only show up in Command Palette when the check function returns true
		//       return true;
		//     }
		//   },
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TotlSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		//   window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000),
		// );
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// class SampleModal extends Modal {
//   constructor(app: App) {
//     super(app);
//   }

//   onOpen() {
//     const { contentEl } = this;
//     contentEl.setText("Woah!");
//   }

//   onClose() {
//     const { contentEl } = this;
//     contentEl.empty();
//   }
// }

class TotlSettingTab extends PluginSettingTab {
	plugin: TotlPlugin;

	constructor(app: App, plugin: TotlPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Obsidian Totl Settings" });

		// new Setting(containerEl)
		//   .setName("Setting #1")
		//   .setDesc("It's a secret")
		//   .addText((text) =>
		//     text
		//       .setPlaceholder("Enter your secret")
		//       .setValue(this.plugin.settings.mySetting)
		//       .onChange(async (value) => {
		//         console.log("Secret: " + value);
		//         this.plugin.settings.mySetting = value;
		//         await this.plugin.saveSettings();
		//       }),
		//   );

		new Setting(containerEl)
			.setName("Decimals")
			.setDesc("Set decimals for calculations")
			.addDropdown((d) => {
				d.addOption("", "0");
				d.addOption("0", "0.0");
				d.addOption("00", "0.00");
				d.addOption("000", "0.000");
				d.addOption("0000", "0.0000");
				d.setValue(this.plugin.settings.precision);
				d.onChange(async (e) => {
					this.plugin.settings.precision = e;
					await this.plugin.saveSettings();
				});
			});
	}
}
