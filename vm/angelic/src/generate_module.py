#!/usr/bin/env python

# Licensed to Pioneers in Engineering under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  Pioneers in Engineering licenses
# this file to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
#  with the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License

from __future__ import print_function
import os.path
import sys
try:
    import yaml
except ImportError:
    print('Please install PyYaml')
    sys.exit(1)


def main():
    if len(sys.argv) != 3:
        print('Usage {0} module.yaml output.c'.format(sys.argv[0]))
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    module = []

    with open(input_file) as f:
        module = yaml.load(f)

    form = (
        '// DO NOT EDIT THIS FILE!\n'
        '// This file is autogenerated.\n'
        '// You should edit the source file {infile} instead.\n'
        '\n'
        '{body}'
        '\n')

    line = '  (ngl_module_entry) {{ "{name}", (ngl_obj *) {cobj} }},'

    lines = '\n'.join(line.format(**v) for v in module)

    body = (
        'ngl_uint {module_name}_length = {length};\n'
        'ngl_module_entry {module_name}[{length}] = {{\n'
        '{lines}\n'
        '}};\n')
    module_name = os.path.splitext(os.path.split(input_file)[-1])[0]

    output = form.format(infile=repr(input_file),
                         body=body.format(lines=lines,
                                          length=len(module),
                                          module_name=module_name))

    with open(output_file, 'w') as f:
        f.write(output)


if __name__ == '__main__':
    main()
