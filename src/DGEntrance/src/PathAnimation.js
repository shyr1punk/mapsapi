L.Path.ANIMATION_AVAILABLE = 
    L.Browser.svg &&
    Object.prototype.toString.call(
        document.createElementNS(L.Path.SVG_NS, 'animate').beginElement) === '[object Function]';

if (L.Path.ANIMATION_AVAILABLE) {
    L.Path.include({

        onAdd: function (map) {
           this._map = map;

            if (!this._container) {
                this._initElements();
                this._initEvents();
            }

            this.projectLatlngs();
            this._updatePath();

            if (this._container) {
                this._map._pathRoot.appendChild(this._container);
            }

            this.fire('add');

            map.on({
                'viewreset': this.projectLatlngs,
                'moveend': this._updatePath
            }, this);

            this.animations = {};
            this._addAnimations();
            map.on('moveend', this._updateAnimations, this);
            map.on('zoomend', this._updateAnimations, this);
        },

        runAnimation: function (name) {
            if (this.animations[name]) {
                this.animations[name].beginElement();
            }
            return this;
        },

        stopAnimation: function (name) {
            if (this.animations[name]) {
                this.animations[name].endElement();
            }
            return this;
        },

        onRemove: function (map) {
            map._pathRoot.removeChild(this._container);
            // Need to fire remove event before we set _map to null as the event hooks might need the object
            this.fire('remove');
            this._map = null;        

            if (L.Browser.vml) {
                this._container = null;
                this._stroke = null;
                this._fill = null;
            }

            map.off({
                'viewreset': this.projectLatlngs,
                'moveend': this._updatePath
            }, this);

            this.animations = {};
            map.off('moveend', this._updateAnimations, this);
            map.off('zoomend', this._updateAnimations, this);
        },

        _updateAnimations: function () {
            this._removeAnimations();
            this._addAnimations();
        },

        _addAnimations: function () {
            var animation = this.options.animation;
            if (animation && this._originalPoints.length > 0) {
                for (var i = 0, len = animation.length; i < len; i++) {
                    this._addAnimation(animation[i], this._originalPoints);
                }
            }
        },

        _addAnimation: function (options, points) { // (Object, Array)
            if (options.getValues) {
                //calculate values if attributeName: 'd' was used to animate
                options.values = options.getValues(points);
            }
            var animation = this._createElement('animate');
            for (key in options) {
                if (Object.prototype.toString.call(options[key]) !== '[object Function]') {
                    animation.setAttribute(key, options[key]);
                }
            }

            this._path.appendChild(animation);
            this.animations[options.id] = animation;
        },

        _removeAnimations: function () {
            var animations = this.animations;
            for(var animation in animations) {
                if (animations.hasOwnProperty(animation)) {
                    //for correct geometry presentation while zooming
                    this._path.removeChild(animations[animation]);
                }
            }
            this.animations = {};
        }
    });
};