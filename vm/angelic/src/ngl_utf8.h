// Licensed to Pioneers in Engineering under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  Pioneers in Engineering licenses
// this file to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
//  with the License.  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License

#ifndef NGL_UTF8_H_
#define NGL_UTF8_H_
#include <ngl_error.h>
#include <stdint.h>
#include <ngl_str.h>
#include <stdbool.h>

extern ngl_error ngl_invalid_utf8;

ngl_error *ngl_utf8_get(uint32_t * dst, const char **c, const char *past_end);

bool ngl_utf8_valid(ngl_str * str);

#endif  // NGL_UTF8_H_
