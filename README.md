# Obsidian Totl

A simple calculator like Solvr, Numbr or Numi.

This Obsidian Plugin adds a new code block type `totl` that will calculate all operations in the code block and display them in a right hand column.

## Usage

Start a new code block using backticks "```" and write `totl` as the code block type, all values contained inside will be calculated when the code block is exited

![obsidian-solve](https://user-images.githubusercontent.com/1715356/199854778-4386b2b0-dfff-433f-b0d3-50729678b2ff.gif)

## Example

```totl

variable = 123
num = 8382
TOTAL


# Heading

100
100
TOTAL

---

# Second heading

239932 // This is a comment

20% of 138291


```

## Variables

You can create variables and asign them values and reuse them inside very code block

## Operators

Obsidian Solve allows the following operators

- "+" Addition
- "-" Substraction
- "\*" Multiplication
- "/" Division
- "%" Percentage
- "TOTAL" Adds all of the preceding lines until there is a line break
- "#" Heading
- "---" Divider

## Units

Obsidian Solve supports units when added to every line item

```totl
100 km
100 mi
```

## License

## Contributions

This plugin was created by [Darius Lau](github.com/DariusLau) its my first obsidian plugin, so issues will crop up, feel free to contribute and request PRs.
