'use strict';

exports.getRealCommandName = (commandName, Commands) => {
  let realName = commandName;
  for (const [ name, Command ] of Commands.entries()) {
    if (
      name === commandName ||
      Command.prototype.aliases.includes(commandName)
    ) {
      realName = name;
    }
  }
  return realName;
};
