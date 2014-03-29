var misc = require('./misc.js');
var yaml = require('../vendor-js/js-yaml/lib/js-yaml.js');
var fs = require('./fs.js');

//
// This is the JavaScript side of the Typpo system.
// It exposes the ability to create a factory object, which can then be used to
// create objects and serialize them to buffers.
//
// For more details, see commond_defs/types.yaml.
//

var kind_prototypes = { };

// Wrap a base type
kind_prototypes.base = {
  init : function ( ) {
    this.val = null;
    },
  wrap : function ( factory, type, val ) {
    var out = factory.create ( type.name );
    out.set ( val );
    return out;
    },
  set : function ( val ) {
    // Allow setting to a wrapped type or an unwrapped type.
    if ( typeof val !== 'number' && val.type.kind === 'base' ) {
      val = val.val;
      }
    this.val = val;
    },
  get_write_method : function get_write_method ( buffer ) {
    if ( this.type.write_method !== 'undefined' ) {
      var size = this.factory.get_size ( this.type );
      var prefix;
      if ( this.type.repr === 'integer' ) {
        // Calculate the number of bits from the number of bytes.
        prefix = 'Int' + ( size * 8 );
        }
      else if ( this.type.repr === 'unsigned' ) {
        prefix = 'UInt' + ( size * 8 );
        }
      else if ( this.type.repr === 'floating' ) {
        if ( size === 4 ) {
          prefix = 'Float';
          }
        else if ( size === 8 ) {
          prefix = 'Double';
          }
        else {
          throw 'Unsupported size for floating point value!';
          }
        }
      var method_name = [ 'write' + prefix + 'LE' ];
      // Cache the method name in the type for later use.
      this.type.write_method = buffer [ method_name ];
      }
    return this.type.write_method;
    },
  write : function ( buffer ) {
    // Call the appropriate write method on the buffer.
    this.get_write_method ( buffer ).apply ( buffer, [ this.val, this.offset ] );
    },
  set_offset : function set_offset ( offset ) {
    this.offset = offset;
    },
  };

// From this side, these two kinds act identically.
kind_prototypes.alien = kind_prototypes.base;

// Used by both union and struct kinds to get the type of a slot by name.
function get_slot_type ( factory, type, slot_name ) {
  if ( typeof slot_name !== 'string' ) {
    throw 'Need slot name!';
    }
  for ( var s in type.slots ) {
    var slot = type.slots [ s ];
    if ( slot.name === slot_name ) {
      return factory.get_type ( slot.type );
      }
    }
  throw 'Slot ' + slot_name + ' does not exist in type ' + type.name;
  }

kind_prototypes.struct = {
  init : function ( ) {
    this.slot_values = { };
    },
  wrap : function ( factory, type, obj ) {
    // Wrap around an object which has fields names which are the same as the
    // struct.
    if ( obj.type === type ) {
      return obj;
      }
    else {
      var out = factory.create ( type.name );
      for ( var k in obj ) {
        // Set all available fields.
        out.set_slot ( k, obj [ k ] );
        }
      return out;
      }
    },
  set_slot : function ( slot_name, val ) {
    var type = get_slot_type ( this.factory, this.type, slot_name );
    this.slot_values [ slot_name ] = this.factory.wrap ( type, val );
    this.recalculate_offsets ( );
    },
  recalculate_offsets : function recalculate_offsets ( ) {
    // Cause all offsets of slots to be recalculated.
    this.set_offset ( this.offset );
    },
  set_offset : function set_offset ( offset ) {
    this.offset = offset;
    for ( var s in this.type.slots ) {
      // Recalculate the offsets of all slots.
      var slot = this.type.slots [ s ];
      var val = this.slot_values [ slot.name ];
      if ( val !== undefined ) {
        val.set_offset ( offset );
        }
      offset += this.factory.get_size ( this.factory.get_type ( slot.type ) );
      }
    },
  write : function ( buffer ) {
    // Recursively write all of the slots.
    for ( var s in this.type.slots ) {
      var slot = this.type.slots [ s ];
      var val = this.slot_values [ slot.name ];
      if ( val === undefined ) {
        throw 'No value for field ' + slot.name;
        }
      val.write ( buffer );
      }
    },
  };

kind_prototypes.union = {
  init : function ( ) {
    this.last_set_slot = null;
    this.last_set_value = null;
    },
  wrap : function ( factory, type, obj ) {
    if ( obj.type === type ) {
      return obj;
      }
    else {
      var out = factory.create ( type.name );
      out.last_set_value = factory.wrap ( obj );
      return out;
      }
    },
  set_slot : function ( slot_name, val ) {
    // Record only the most recent assignment.
    var type = get_slot_type ( this.factory, this.type, slot_name );
    this.last_set_slot = slot_name;
    this.last_set_value = this.factory.wrap ( type, val );
    },
  write : function ( buffer ) {
    this.last_set_value.write ( buffer );
    },
  set_offset : function set_offset ( offset ) {
    this.offset = offset;
    if ( this.last_set_value ) {
      this.last_set_value.set_offset ( offset );
      }
    },
  };

function get_proto ( type ) {
  return kind_prototypes [ type.kind ];
  }

// This is the main interface to this module.
var factory_prototype = {
  load_type_file : function ( filename ) {
    var types = yaml.safeLoad ( fs.readFileSync ( filename, 'utf-8' ) );
    this.load_types ( types );
    },
  get_type : function get_type ( typename ) {
    return this.types [ typename ];
    },
  get_size : function get_size ( type ) {
    if ( type.size === 'native' ) {
      if ( this.target_type === 'ARM' || this.target_type ===  'js' ) {
        return 4;
        }
      else if ( this.target_type === 'x86_64' ) {
        return 8;
        }
      else {
        throw 'Unknown platform!';
        }
      }
    else {
      return type.size;
      }
    },
  create : function create ( typename ) {
    var type = this.get_type ( typename );
    var prototype = get_proto ( type );
    var out = misc.obj_or ( Object.create ( prototype ), {
      factory : this,
      type : type,
      offset : 0,
      } );
    out.init ( );
    return out;
    },
  load_types : function load_types ( type_list ) {
    var type_map = {};
    for ( var t in type_list ) {
      var type = type_list[t];
      type_map[type.name] = type;
      }
    this.types = type_map;
    },
  set_target_type : function set_target_type ( target_type ) {
    this.target_type = target_type;
    },
  wrap : function wrap ( type, val ) {
    var proto = get_proto ( type );
    return proto.wrap ( this, type, val );
    },
  };

// Create a new factory.
function make ( types, target_type ) {
  var out = Object.create ( factory_prototype );
  out.target_type = target_type;
  out.load_types ( types );
  return out;
  }

exports.make = make;