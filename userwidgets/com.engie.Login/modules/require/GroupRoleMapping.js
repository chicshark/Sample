define(function () {   
  kony.print("GroupRoleMapping.js.require");
  var GroupRoleMapping = function(arrayOfGroupRoleMaps) {
    kony.print("GroupRoleMapping.js.constructor");
    var _mappings = arrayOfGroupRoleMaps? arrayOfGroupRoleMaps : [];
    
    function addMapping(roleGroupMapping) {
      if (roleGroupMapping.group!==undefined && 
          roleGroupMapping.group!==null &&
          roleGroupMapping.role!==undefined &&
          roleGroupMapping.role!==null) {
      _mappings.push(roleGroupMapping);
      } else {
        kony.print("GroupRoleMapping.js.addMapping: You must provide a map like {group:'name of group',role:'name of role'}.");
      }
    }
    
	function getRoles(groupsOfUser) {
      var roles = [];
      for (var i=0; i<_mappings.length; i++) {
        var groupToTest = _mappings[i].group;
        var roleToAdd = _mappings[i].role;
        for (var m=0; m<groupsOfUser.length; m++) {
          if (groupsOfUser[m]==groupToTest) {
            roles.push(roleToAdd);
          }
        }
      }
      return roles;
    }    
    
    //Here we expose the public variables and functions
    return {
      typeOf:GroupRoleMapping.typeOf,
      addMapping: addMapping,
      getRoles: getRoles
    };
  }; 
  GroupRoleMapping.typeOf="GroupRoleMapping";
  return GroupRoleMapping;
});