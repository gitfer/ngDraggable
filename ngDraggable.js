'use strict';
/*
 *
 * https://github.com/fatlinesofcode/ngDraggable
 */
angular.module('ngDraggable', ['angularUtils'])
    .directive('ngDraggableElement', ['$compile', '$http', '$templateCache', 
        function($compile, $http, $templateCache) {
            var getTemplate = function(type) {
                var templateLoader,
                    baseUrl = 'bower_components/ngDraggable/template/ngDraggableElement';
                var templateUrl = baseUrl + type + '.html';
                templateLoader = $http.get(templateUrl, {
                    cache: $templateCache
                });
                return templateLoader;
            };
            return {
                restrict: 'E',
                scope: {
                    droppa: '&',
                    riordina: '&',
                    elementidroppati: '=',
                    idAreaDroppabile: '@',
                    className: '@',
                    styleInline: '@',
                    type: '@'
                },
                link: function(scope, element, attrs) {
                    var templateType = attrs.type || '';
                    var loader = getTemplate(templateType);
                    loader.success(function(html) {
                        element.html(html);
                    }).then(function() {
                        var el = $compile(element.html())(scope);
                        element.replaceWith(el);
                    });
                }
            };
        }
    ])
    .directive('ngDrag', ['$rootScope', '$parse', '$compile', '$timeout',
        function($rootScope, $parse, $compile, $timeout) {
            return {
                restrict: 'A',
                link: function(scope, element, attrs) {
                    scope.value = attrs.ngDrag;
                    scope.sorgente = attrs.ngSorgente;
                    scope.optsEditor = {
                        directionality: 'ltr',
                        plugins: 'code',
                        toolbar: 'styleselect bold italic print forecolor backcolor'
                    };
                    scope.ngDropIdCollection = attrs.ngDropIdCollection || scope.$parent.idAreaDroppabile;
                    //  return;
                    var offset, _mx, _my, _tx, _ty;
                    var _hasTouch = ('ontouchstart' in document.documentElement);
                    var _pressEvents = 'touchstart mousedown';
                    var _moveEvents = 'touchmove mousemove';
                    var _releaseEvents = 'touchend mouseup';

                    var $document = $(document);
                    var $window = $(window);
                    var _data = null;

                    var _dragEnabled = false;

                    var _pressTimer = null;

                    var onDragSuccessCallback = $parse(attrs.ngDragSuccess) || null;

                    var initialize = function() {
                        element.attr('draggable', 'false'); // prevent native drag
                        toggleListeners(true);
                    };


                    var toggleListeners = function(enable) {
                        // remove listeners

                        if (!enable) {
                            return;
                        }
                        // add listeners.

                        scope.$on('$destroy', onDestroy);
                        attrs.$observe('ngDrag', onEnableChange);
                        scope.$watch(attrs.ngDragData, onDragDataChange);
                        element.on(_pressEvents, onpress);
                        if (!_hasTouch) {
                            element.on('mousedown', function() {
                                return false;
                            }); // prevent native drag
                        }
                    };
                    var onDestroy = function() {
                        toggleListeners(false);
                    };
                    var onDragDataChange = function(newVal) {
                        _data = newVal;
                    };
                    var onEnableChange = function(newVal) {
                        _dragEnabled = scope.$eval(newVal);

                    };
                    /*
                     * When the element is clicked start the drag behaviour
                     * On touch devices as a small delay so as not to prevent native window scrolling
                     */
                    var onpress = function(evt) {

                        if (evt.shiftKey &&  _data.sorgente === 'reorder') {
                            ondblclick();
                            return;
                        }

                        if (!_dragEnabled) {
                            return;
                        }

                        if (_hasTouch) {
                            cancelPress();
                            _pressTimer = setTimeout(function() {
                                cancelPress();
                                onlongpress(evt);
                            }, 100);
                            $document.on(_moveEvents, cancelPress);
                            $document.on(_releaseEvents, cancelPress);
                        } else {
                            onlongpress(evt);
                        }

                    };
                    var createId = function(callback) {
                        callback(scope.$id + Math.random(new Date() * Math.random()) * 100000000000000000);
                    };

                    var compileEditor = function(contenuto) {
                        createId(function(id) {
                            var el = angular.element('<div class="editorEl" id=\"' + id + '\" ui-tinymce="{{optsEditor}}" ng-model="editorContent"></div>');
                            var l = $compile(el);
                            element.append(el);
                            l(scope);

                            $timeout(function() {
                                if (tinymce.get(id) !== undefined) {
                                    tinymce.get(id).setContent(contenuto);
                                }
                                $rootScope.$broadcast('idEditor:changed', {
                                    id: scope.obj.id,
                                    idCollection: scope.obj.ngDropIdCollection,
                                    idEditor: id
                                });
                            }, 800);
                        });
                    };
                    var ondblclick = function() {
                        _dragEnabled = false;
                        if (_data.sorgente === 'reorder') {
                            var editor = tinymce.get(scope.obj.idEditor);
                            if (editor === null || editor.length === 0) {
                                element.find('.contentEl > div').hide();

                                var contenuto = scope.obj.contenuto;
                                // Creo l'editor
                                compileEditor(contenuto);

                                $rootScope.$broadcast('setEdit:dblclick', {
                                    data: _data,
                                    contenuto: contenuto
                                });
                            } else {
                                element.find('.contentEl > div').show();
                                _data.contenuto = editor.getContent();

                                // Rimuovo tutto quello che riguarda l'editor
                                element.find('.editorEl').remove();
                                tinyMCE.remove();

                                $rootScope.$broadcast('finishEdit:dblclick', {
                                    data: _data
                                });
                                _dragEnabled = true;
                            }
                        } else {
                            $rootScope.$broadcast('draggable:dblclick', {
                                dragEnabled: _dragEnabled,
                                element: element,
                                data: _data
                            });
                        }
                    };
                    var cancelPress = function() {
                        clearTimeout(_pressTimer);
                        $document.off(_moveEvents, cancelPress);
                        $document.off(_releaseEvents, cancelPress);
                    };
                    var onlongpress = function(evt) {
                        if (!_dragEnabled) {
                            return;
                        }
                        evt.preventDefault();
                        offset = element.offset();
                        element.centerX = (element.width() / 2);
                        element.centerY = (element.height() / 2);
                        element.addClass('dragging');
                        _mx = (evt.pageX || evt.originalEvent.touches[0].pageX);
                        _my = (evt.pageY || evt.originalEvent.touches[0].pageY);
                        _tx = _mx - element.centerX - $window.scrollLeft();
                        _ty = _my - element.centerY - $window.scrollTop();
                        moveElement(_tx, _ty);
                        $document.on(_moveEvents, onmove);
                        $document.on(_releaseEvents, onrelease);
                        $rootScope.$broadcast('draggable:start', {
                            x: _mx,
                            y: _my,
                            tx: _tx,
                            ty: _ty,
                            element: element,
                            data: _data
                        });

                    };
                    var onmove = function(evt) {
                        if (!_dragEnabled) {
                            return;
                        }
                        evt.preventDefault();

                        _mx = (evt.pageX || evt.originalEvent.touches[0].pageX);
                        _my = (evt.pageY || evt.originalEvent.touches[0].pageY);
                        _tx = _mx - element.centerX - $window.scrollLeft();
                        _ty = _my - element.centerY - $window.scrollTop();
                        moveElement(_tx, _ty);

                        $rootScope.$broadcast('draggable:move', {
                            x: _mx,
                            y: _my,
                            tx: _tx,
                            ty: _ty,
                            element: element,
                            data: _data
                        });

                    };
                    var onrelease = function(evt) {
                        if (!_dragEnabled) {
                            return;
                        }
                        evt.preventDefault();
                        $rootScope.$broadcast('draggable:end', {
                            x: _mx,
                            y: _my,
                            tx: _tx,
                            ty: _ty,
                            element: element,
                            data: _data,
                            callback: onDragComplete
                        });
                        element.removeClass('dragging');
                        reset();
                        $document.off(_moveEvents, onmove);
                        $document.off(_releaseEvents, onrelease);
                    };
                    var onDragComplete = function(evt) {

                        if (!onDragSuccessCallback) {
                            return;
                        }
                        scope.$apply(function() {
                            _data.sorgente = scope.sorgente;
                            _data.idCollezione = scope.ngDropIdCollection;
                            onDragSuccessCallback(scope, {
                                $data: _data,
                                $event: evt
                            });
                        });
                    };
                    var reset = function() {
                        element.css({
                            left: '',
                            top: '',
                            position: '',
                            'z-index': ''
                        });
                    };
                    var moveElement = function(x, y) {
                        element.css({
                            left: x,
                            top: y,
                            position: 'fixed',
                            'z-index': 99999
                        });
                    };
                    initialize();
                }
            };
        }
    ])
    .directive('ngDrop', ['$parse', '$timeout',
        function($parse, $timeout) {
            return {
                restrict: 'A',
                link: function(scope, element, attrs) {
                    scope.value = attrs.ngDrop;

                    var _dropEnabled = false;

                    var onDropCallback = $parse(attrs.ngDropSuccess); // || function(){};
                    var initialize = function() {
                        toggleListeners(true);
                    };


                    var toggleListeners = function(enable) {
                        // remove listeners

                        if (!enable) {
                            return;
                        }
                        // add listeners.
                        attrs.$observe('ngDrop', onEnableChange);
                        scope.$on('$destroy', onDestroy);
                        //scope.$watch(attrs.uiDraggable, onDraggableChange);
                        scope.$on('draggable:start', onDragStart);
                        scope.$on('draggable:move', onDragMove);
                        scope.$on('draggable:end', onDragEnd);
                    };
                    var onDestroy = function() {
                        toggleListeners(false);
                    };
                    var onEnableChange = function(newVal) {
                        _dropEnabled = scope.$eval(newVal);
                    };
                    var onDragStart = function(evt, obj) {
                        if (!_dropEnabled) {
                            return;
                        }
                        isTouching(obj.x, obj.y, obj.element);
                    };
                    var onDragMove = function(evt, obj) {
                        if (!_dropEnabled) {
                            return;
                        }
                        isTouching(obj.x, obj.y, obj.element);
                    };
                    var onDragEnd = function(evt, obj) {
                        if (!_dropEnabled) {
                            return;
                        }
                        if (isTouching(obj.x, obj.y, obj.element)) {
                            // call the ngDraggable element callback
                            if (obj.callback) {
                                obj.callback(evt);
                            }

                            // call the ngDrop element callback
                            //   scope.$apply(function () {
                            //       onDropCallback(scope, {$data: obj.data, $event: evt});
                            //   });

                            // Se non la trovo sull'elemento provo sul padre
                            obj.data.ngDropIdCollection = attrs.ngDropIdCollection || scope.$parent.idAreaDroppabile;
                            $timeout(function() {
                                onDropCallback(scope, {
                                    $data: obj.data,
                                    $event: evt
                                });
                                if (attrs.ngSorgente !== undefined) {
                                    // element.html('<input type="button" value="'+scope.obj.contenuto+'"></input> ')
                                    // element.css('display', 'block')
                                    element.parent().removeClass('blocco');
                                    element.removeClass('blocco');
                                    element.parent().removeClass('blocco');
                                    var allineamento = scope.obj.allineamento;
                                    element.parent().css({
                                        display: allineamento
                                    });
                                    element.css({
                                        display: allineamento
                                    });
                                }
                            });
                        }
                        updateDragStyles(false, obj.element);
                    };
                    var isTouching = function(mouseX, mouseY, dragElement) {
                        var touching = hitTest(mouseX, mouseY);
                        updateDragStyles(touching, dragElement);
                        return touching;
                    };
                    var updateDragStyles = function(touching, dragElement) {
                        if (touching) {
                            element.addClass('drag-enter');
                            dragElement.addClass('drag-over');
                        } else {
                            element.removeClass('drag-enter');
                            dragElement.removeClass('drag-over');
                        }
                    };
                    var hitTest = function(x, y) {
                        var bounds = element.offset();
                        bounds.right = bounds.left + element.outerWidth();
                        bounds.bottom = bounds.top + element.outerHeight();
                        return x >= bounds.left && x <= bounds.right && y <= bounds.bottom && y >= bounds.top;
                    };

                    initialize();
                }
            };
        }
    ])
    .directive('ngDragClone', [

        function() {
            return {
                restrict: 'A',
                link: function(scope, element) {
                    var img;
                    scope.clonedData = {};
                    var initialize = function() {

                        img = $(element.find('img'));
                        element.attr('draggable', 'false');
                        img.attr('draggable', 'false');
                        reset();
                        toggleListeners(true);
                    };


                    var toggleListeners = function(enable) {
                        // remove listeners

                        if (!enable) {
                            return;
                        }
                        // add listeners.
                        scope.$on('draggable:start', onDragStart);
                        scope.$on('draggable:move', onDragMove);
                        scope.$on('draggable:end', onDragEnd);
                        preventContextMenu();

                    };
                    var preventContextMenu = function() {
                        //  element.off('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                        img.off('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                        //  element.on('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                        img.on('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                    };
                    var onDragStart = function(evt, obj) {
                        scope.$apply(function() {
                            scope.clonedData = obj.data;
                        });
                        element.css('width', obj.element.height());
                        element.css('height', obj.element.height());

                        moveElement(obj.tx, obj.ty);
                    };
                    var onDragMove = function(evt, obj) {
                        moveElement(obj.tx, obj.ty);
                    };
                    var onDragEnd = function() {
                        reset();
                    };

                    var reset = function() {
                        element.css({
                            left: 0,
                            top: 0,
                            position: 'fixed',
                            'z-index': -1,
                            visibility: 'hidden'
                        });
                    };
                    var moveElement = function(x, y) {
                        element.css({
                            left: x,
                            top: y,
                            position: 'fixed',
                            'z-index': 99999,
                            visibility: 'visible'
                        });
                    };

                    var absorbEvent_ = function(event) {
                        var e = event.originalEvent;
                        e.preventDefault && e.preventDefault();
                        e.stopPropagation && e.stopPropagation();
                        e.cancelBubble = true;
                        e.returnValue = false;
                        return false;
                    };

                    initialize();
                }
            };
        }
    ])
    .directive('ngPreventDrag', [

        function() {
            return {
                restrict: 'A',
                link: function(scope, element) {
                    var initialize = function() {

                        element.attr('draggable', 'false');
                        toggleListeners(true);
                    };


                    var toggleListeners = function(enable) {
                        // remove listeners

                        if (!enable) {
                            return;
                        }
                        // add listeners.
                        element.on('mousedown touchstart touchmove touchend touchcancel', absorbEvent_);
                    };


                    var absorbEvent_ = function(event) {
                        var e = event.originalEvent;
                        e.preventDefault && e.preventDefault();
                        e.stopPropagation && e.stopPropagation();
                        e.cancelBubble = true;
                        e.returnValue = false;
                        return false;
                    };

                    initialize();
                }
            };
        }
    ]);
