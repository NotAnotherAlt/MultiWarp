// Under MIT LICENSE (C)
// Version 1.7
// Created by Mariocraft987 {https://scratch.mit.edu/users/mariocraft987/}

(function (Scratch) {
  "use strict";
  class RandomlyBlocks {
    getInfo() {
      return {
        id: 'randomlyblockscool',
        name: 'Randomly Blocks',
        color1: '#07f290',
        color2: '#1ee894',
        blocks: [
          {
            opcode: 'alertname',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Alert [STR]',
            disableMonitor: true,
            arguments: {
              STR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Hello world!"
              },
            }
          },
          {
            opcode: 'changeTitle',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Change website title to [STR]',
            disableMonitor: true,
            arguments: {
              STR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Randomly blocks"
              },
            }
          },
          {
            opcode: 'consoleAdd',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Add [STR] to console log',
            disableMonitor: true,
            arguments: {
              STR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Penguin"
              },
            }
          },
          {
            opcode: 'consoleError',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Add [STR] to console error',
            disableMonitor: true,
            arguments: {
              STR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "banana"
              },
            }
          },
          "---",
          {
            opcode: 'amExist',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'True?',
            disableMonitor: true,
          },
          {
            opcode: 'notExist',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'Do Dinosaurs exist?',
            disableMonitor: true,
          },
          {
            opcode: 'YesNoAlert',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '"Ok" button pressed on alert [STR]?',
            disableMonitor: true,
            arguments: {
              STR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Popup"
              },
            }
          },
          {
            opcode: 'inputAlert',
            blockType: Scratch.BlockType.REPORTER,
            text: 'Input of [STR] with default of [default]',
            disableMonitor: true,
            arguments: {
              STR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "What's your username?"
              },
              default: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "mariocraft987"
              },
            }
          },
          {
            opcode: 'getDate',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get Date',
            disableMonitor: true,
          },
          {
            opcode: 'getMilisecs',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get Milliseconds',
            disableMonitor: true,
          },
          {
            opcode: 'getTime1970',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get Milliseconds since 1970',
            disableMonitor: true,
          },
          {
            opcode: 'currentHoliday',
            blockType: Scratch.BlockType.REPORTER,
            text: 'current holiday',
            disableMonitor: true, 
          },
        ],
      };
    }
    alertname(args) {
      alert(args.STR)
    }    
      
    changeTitle(args) {
      document.title = args.STR
    }

    consoleAdd(args) {
      console.log(args.STR)
    }

    consoleError(args) {
      window.console.error(args.STR)
    }
    
    amExist(args) {
      return "Imposter Reporter as a Boolean!!"
    }
    
    notExist(args) {
      return false
    }
    
    getDate(args) {
      let date = Date()
      return date
    }

    getMilisecs(args) {
      let date = new Date()
      return date.getMilliseconds();
    }

    getTime1970(args) {
      let date = new Date()
      return date.getTime();
    }

    YesNoAlert(args) {
      let jtext = args.STR
      var pressLog
      if (confirm(jtext) == true) {
        pressLog = true
      } else {
        pressLog = false
      }
      return pressLog
    }
    
    inputAlert(args) {
        let question = args.STR
        let normal = args.default
        let answer = prompt(question, normal);
      if (answer != null) {
        return answer
      }
    }
    
    currentHoliday(args) {
        let date = new Date();
        let month = date.getMonth()
        let day = date.getDate()
            if (month == 0) {
                if (day == 1) {return "New Year"}
                if (day == 15) {return "Martin Luther King"}
            }else
            if (month == 1) {
                if (day == 2) {return "Groundhog's Day"}
                if (day == 19) {return "Presidents' Day"}
            }else
            if (month == 2) {
                if (day == 31) {return "Easter"}
            }else
            if (month == 3) {
                if (day == 15) {return "Tax Day"}
            }else
            if (month == 4) {
                if (day == 12) {return "Mother's Day"}
            }else
            if (month == 5) {
                if (day == 16) {return "Father's Day"}
            }else
            if (month == 6) {
                if (day == 4) {return "Independence Day"}
                if (day == 28) {return "Parents' Day"}
            }else
            if (month == 7) {
                /* Nothing much */
            }else
            if (month == 8) {
                if (day == 2) {return "Labor Day"}
            }else
            if (month == 9) {
                if (day == 31) {return "Halloween"}
            }else
            if (month == 10) {
                if (day == 28) {return "Thanksgiving"}
            }else
            if (month == 11) {
                if (day == 25) {return "Christmas"}
                if (day == 31) {return "New Year's Eve"}
            }
            return "No Important Holidays Today!"
        }
  }
  
  Scratch.extensions.register(new RandomlyBlocks())
})(Scratch);
