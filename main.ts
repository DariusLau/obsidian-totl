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

// Remember to rename these classes and interfaces!

interface SolvePluginSettings {
  mySetting: string;
  precision: number;
}

const DEFAULT_SETTINGS: SolvePluginSettings = {
  mySetting: "default",
  precision: 2,
};

export default class SolvePlugin extends Plugin {
  settings: SolvePluginSettings;

  async onload() {
    await this.loadSettings();

    console.log("obsidian-solve loaded");
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
    // - [ ] Add propper support for * as number multiplier

    this.registerMarkdownCodeBlockProcessor("solve", (source, el, ctx) => {
      const container = el.createEl("div", { cls: "solve-container" });

      // Create a top row that will display our image copy paste button
      const topRow = container.createEl("div", {
        cls: "solve-row-container solve-heading-row",
      });

      // WIP: Copy image to clipboard - start
      // const copyPasteButton = topRow.createEl("div", {
      //   cls: "code-block-flair solve-copy-paste",
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
      const keyWords = [
        { "value": "//", "cls": "solve-comment" },
        { "value": "#", "cls": "solve-heading" },
      ];
      const formattingKeywords = [{ "value": "---", "cls": "solve-divider" }];

      function fcalToFloat(fcal) {
        // console.log("fcalToFloat", fcal);
        var numInDecimal = null;
        if (fcal.n.d[1] !== undefined) {
          numInDecimal = fcal.n.d[0] + "." + fcal.n.d[1];
          // numInDecimal = Number.parseFloat(numInDecimal).toFixed(precision);
        } else {
          numInDecimal = fcal.n.d[0];
        }
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
                    total + " + " + numeral(results[j].calculation).value(),
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
            value = fcalToFloat(fcal.evaluate(calc));
            fcalValue = fcal.evaluate(calc);
          } catch (e) {
            // console.log(e);
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

        // Set default string node, it will be overwritten if there is a
        // keyword, variable or formattingKeyword match
        nodes = [{ "nodeType": "span", "cls": "", "text": rows[i] }];

        // Replace in the row string all occurrences of variable names
        var nodesString = rows[i];

        env.forEach((value, key) => {
          nodesString = nodesString.replaceAll(key, "|" + key + "|");
        });

        const nodesArray = nodesString.split("|");

        // Overwrite default node and add formatting if it contains variables
        if (nodesArray.length > 1) {
          nodes = [];
          nodesArray.forEach((node) => {
            if (node !== "") {
              if (env.has(node)) {
                nodes.push({
                  "nodeType": "span",
                  "cls": "solve-variable",
                  "text": node,
                });
              } else {
                nodes.push({
                  "nodeType": "span",
                  "cls": "",
                  "text": node,
                });
              }
            }
          });
        }

        // Loop through all nodes and evaluate if it contains a keyword
        // If there is a match replace all nodes after the keyword
        nodesArray.forEach((node, m) => {
          keyWords.forEach((keyWord) => {
            if (node == keyWord.value) {
              // Replace nodes variable with existing nodes up to keyword match
              const precedingNodes = nodes.slice(0, m - 1);
              nodes = [...precedingNodes];

              // Flatten all remaining nodes while trimming spaces to avoid double space in join
              const remainingNodes = nodesArray
                .slice(m, nodesArray.length)
                .map((str) => str.trim())
                .flat();

              nodes.push({
                "nodeType": "span",
                "cls": keyWord.cls,
                "text": remainingNodes.join(" "),
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
              { "nodeType": "div", "cls": formattingKeyword.cls, "text": "" },
            ];
          }
        });

        results[i] =
          // {
          //   rows[i],
          //   numeral(value).value("0,0"),
          //   calc,
          //   fcalValue,
          //   nodes,
          // },
          {
            "originalString": rows[i],
            "readableNumber": numeral(value).value(),
            "calculation": calc,
            "fcalValue": fcalValue,
            "nodes": nodes,
          };
      }

      // Render the block with our results
      for (let j = 0; j < results.length; j++) {
        const rowDiv = container.createEl("div", {
          cls: "solve-row-container",
        });

        const leftContainer = rowDiv.createEl("div", {
          cls: "solve-row-left-container",
        });

        results[j].nodes.forEach((element) => {
          leftContainer.createEl(element.nodeType, {
            cls: element.cls,
            text: element.text,
          });
        });

        const rightContainer = rowDiv.createEl("div", {
          cls: "solve-row-right-container",
        });

        var formattedValue = results[j].readableNumber;
        if (formattedValue !== null) {
          formattedValue = numeral(results[j].readableNumber)
            .format("0,0." + precision)
            .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1");

          if (results[j].fcalValue.unit !== undefined) {
            formattedValue += " " + results[j].fcalValue.unit.unitType;
          }
        }

        const rightResultEl = rightContainer.createEl("div", {
          cls: "solve-right-result",
          text: formattedValue,
        });

        // Bind an onclick event for right hand results
        this.registerDomEvent(rightResultEl, "click", (evt: MouseEvent) => {
          console.log("from result", evt.target.childNodes[0].textContent);
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
        });
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
    this.addSettingTab(new SolveSettingTab(this.app, this));

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    // this.registerDomEvent(document, "click", (evt: MouseEvent) => {
    //   console.log("click 🤬", evt);
    // });

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    // this.registerInterval(
    //   window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000),
    // );
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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

class SolveSettingTab extends PluginSettingTab {
  plugin: SolvePlugin;

  constructor(app: App, plugin: SolvePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Obsidian Solve Settings" });

    new Setting(containerEl)
      .setName("Setting #1")
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter your secret")
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
            console.log("Secret: " + value);
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          }),
      );

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
