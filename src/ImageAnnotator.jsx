import React, {Component} from 'react';
import AnnotationLayer from './AnnotationLayer';
import {Editor} from '@recogito/recogito-client-core';

import './ImageAnnotator.scss';

export default class ImageAnnotator extends Component {

    state = {
        selectedAnnotation: null,
        selectedDOMElement: null,
        modifiedTarget: null,

        // ReadOnly mode
        readOnly: this.props.config.readOnly,

        // Headless mode
        editorDisabled: this.props.config.disableEditor,

        // Widgets
        widgets: this.props.config.widgets,

        // Records the state before any potential headless modify (done via
        // .updateSelected) so we can properly fire the updateAnnotation(a, previous)
        // event, and distinguish between headless Save and Cancel
        beforeHeadlessModify: null
    }

    /** Shorthand **/
    clearState = opt_callback => this.setState({
        selectedAnnotation: null,
        selectedDOMElement: null,
        modifiedTarget: null,
        beforeHeadlessModify: null
    }, opt_callback);

    componentDidMount() {
        this.annotationLayer = new AnnotationLayer(this.props);

        this.annotationLayer.on('startSelection', this.handleStartSelect);
        this.annotationLayer.on('select', this.handleSelect);

        this.annotationLayer.on('updateTarget', this.handleUpdateTarget);

        this.forwardEvent('mouseEnterAnnotation', 'onMouseEnterAnnotation');
        this.forwardEvent('mouseLeaveAnnotation', 'onMouseLeaveAnnotation');
        this.forwardEvent('clickAnnotation', 'onClickAnnotation');

        // Escape cancels editing
        document.addEventListener('keyup', this.escapeKeyCancel);
    }

    forwardEvent = (from, to) => {
        this.annotationLayer.on(from, (annotation, elem) => {
            this.props[to](annotation.clone(), elem);
        });
    }

    componentWillUnmount() {
        this.annotationLayer.destroy();
        document.removeEventListener('keyup', this.escapeKeyCancel);
    }

    escapeKeyCancel = evt => {
        if (evt.which === 27) { // Escape
            const {selectedAnnotation} = this.state;
            if (selectedAnnotation) {
                this.cancelSelected();
                this.props.onCancelSelected(selectedAnnotation);
            }
        }
    }

    handleStartSelect = pt =>
        this.props.onSelectionStarted(pt);

    handleSelect = (evt, skipEvent) => {
        this.state.editorDisabled ?
            this.onHeadlessSelect(evt, skipEvent) : this.onNormalSelect(evt, skipEvent);
    }

    /** Selection when editorDisabled == false **/
    onNormalSelect = (evt, skipEvent) => {
        const {annotation, element} = evt;

        if (annotation) {
            // Select action needs to run immediately if no annotation was
            // selected before. Otherwise, make a deselect state change first,
            // and then select after this state change has completed. (This is
            // keep our external event cycle clean!)
            const select = () => {
                this.setState({
                    selectedAnnotation: annotation,
                    selectedDOMElement: element,
                    modifiedTarget: null,
                    beforeHeadlessModify: null
                }, () => {
                    if (!skipEvent) {
                        if (annotation.isSelection) {
                            this.props.onSelectionCreated(annotation.clone());
                        } else {
                            this.props.onAnnotationSelected(annotation.clone(), element);
                        }
                    }
                });
            }

            // If there is another selected annotation,
            // fire cancel before making the new selection
            const {selectedAnnotation} = this.state;

            if (selectedAnnotation && !selectedAnnotation.isEqual(annotation)) {
                this.clearState(() => {
                    this.props.onCancelSelected(selectedAnnotation);
                    select();
                });
            } else {
                select();
            }
        } else {
            const {selectedAnnotation} = this.state;

            if (selectedAnnotation)
                this.clearState(() => {
                    this.props.onCancelSelected(selectedAnnotation);
                });
            else
                this.clearState();
        }
    }

    /** Selection when editorDisabled == true **/
    onHeadlessSelect = (evt, skipEvent) => {
        // When in headless mode, changing selection acts as 'Ok' - changes
        // to the previous annotation are stored! (In normal mode, selection
        // acts as 'Cancel'.)
        this.saveSelected().then(() => {
            this.onNormalSelect(evt, skipEvent);

            const {annotation} = evt;

            if (annotation && !annotation.isSelection) {
                const selection = this.annotationLayer.selectAnnotation(evt.annotation, true);
                this.setState({selectedDOMElement: selection.element});
            }
        });
    }

    handleUpdateTarget = (selectedDOMElement, modifiedTarget) => {
        this.setState({selectedDOMElement, modifiedTarget});

        const clone = JSON.parse(JSON.stringify(modifiedTarget));
        this.props.onSelectionTargetChanged(clone);
    }

    /**
     * A convenience method that allows the external application to
     * override the autogenerated Id for an annotation.
     */
    overrideAnnotationId = originalAnnotation => forcedId => {
        const {id} = originalAnnotation;

        // Force the editor to close first, otherwise there's a risk of orphaned annotation
        if (this.state.selectedAnnotation) {
            this.clearState(() => {
                this.annotationLayer.overrideId(id, forcedId);
            });
        } else {
            this.annotationLayer.overrideId(id, forcedId);
        }
    }

    /**************************/
    /* Annotation CRUD events */
    /**************************/

    /** Common handler for annotation CREATE or UPDATE **/
    onCreateOrUpdateAnnotation = (method, opt_callback) => (annotation, previous) => {
        // Merge updated target if necessary
        let a = annotation.isSelection ? annotation.toAnnotation() : annotation;

        a = (this.state.modifiedTarget) ?
            a.clone({target: this.state.modifiedTarget}) : a.clone();

        this.clearState(() => {
            this.annotationLayer.deselect();
            this.annotationLayer.addOrUpdateAnnotation(a, previous);

            // Call CREATE or UPDATE handler
            if (previous)
                this.props[method](a, previous.clone());
            else
                this.props[method](a, this.overrideAnnotationId(a));

            opt_callback && opt_callback();
        });
    }

    onDeleteAnnotation = annotation => {
        this.clearState();
        this.annotationLayer.removeAnnotation(annotation);
        this.props.onAnnotationDeleted(annotation);
    }

    onCancelAnnotation = (annotation, opt_callback) => {
        this.annotationLayer.deselect();
        this.props.onCancelSelected(annotation);
        this.clearState(opt_callback);
    }

    /****************/
    /* External API */
    /****************/

    addAnnotation = annotation =>
        this.annotationLayer.addOrUpdateAnnotation(annotation.clone());

    addDrawingTool = plugin =>
        this.annotationLayer.addDrawingTool(plugin);

    cancelSelected = () => {
        this.annotationLayer.deselect();

        if (this.state.selectedAnnotation)
            this.clearState();
    }

    get disableEditor() {
        return this.state.editorDisabled;
    }

    set disableEditor(disabled) {
        this.setState({editorDisabled: disabled}, () => {
            // En- or disable Esc key listener
            if (disabled)
                document.addEventListener('keyup', this.escapeKeyCancel);
            else
                document.removeEventListener('keyup', this.escapeKeyCancel);
        });
    }

    get disableSelect() {
        return this.annotationLayer.disableSelect;
    }

    set disableSelect(disable) {
        this.annotationLayer.disableSelect = disable;
    }

    getAnnotations = () =>
        this.annotationLayer.getAnnotations().map(a => a.clone());

    getSelected = () => {
        const selected = this.annotationLayer.getSelected();
        return selected ? selected.annotation.clone() : null;
    }

    getSelectedImageSnippet = () =>
        this.annotationLayer.getSelectedImageSnippet();

    listDrawingTools = () =>
        this.annotationLayer.listDrawingTools();

    get readOnly() {
        return this.state.readOnly;
    }

    set readOnly(readOnly) {
        this.annotationLayer.readOnly = readOnly;
        this.setState({readOnly});
    }

    removeAnnotation = annotationOrId =>
        this.annotationLayer.removeAnnotation(annotationOrId);

    saveSelected = () =>
        new Promise(resolve => {
            const a = this.state.selectedAnnotation;

            if (a) {
                if (a.isSelection) {
                    if (a.bodies.length > 0 || this.props.config.allowEmpty) {
                        this.onCreateOrUpdateAnnotation('onAnnotationCreated', resolve)(a.toAnnotation(), a);
                    } else {
                        this.annotationLayer.deselect();
                        resolve();
                    }
                } else {
                    // Headless update?
                    const {beforeHeadlessModify, modifiedTarget} = this.state;

                    if (beforeHeadlessModify) {
                        // Annotation was modified using '.updateSelected()'
                        this.onCreateOrUpdateAnnotation('onAnnotationUpdated', resolve)(a, beforeHeadlessModify);
                    } else if (modifiedTarget) {
                        // Target was modified, but otherwise no change
                        this.onCreateOrUpdateAnnotation('onAnnotationUpdated', resolve)(a, a);
                    } else {
                        this.onCancelAnnotation(a, resolve);
                    }
                }
            } else {
                resolve();
            }
        });

    selectAnnotation = (arg, skipEvent=true) => {
        const selected = this.annotationLayer.selectAnnotation(arg, skipEvent);

        if (selected) {
            this.handleSelect(selected, skipEvent);
            return selected.annotation.clone();
        } else {
            this.clearState(); // Deselect
        }
    }

    setAnnotations = annotations =>
        this.annotationLayer.init(annotations.map(a => a.clone()));

    setDrawingTool = shape =>
        this.annotationLayer.setDrawingTool(shape);

    setVisible = visible => {
        this.annotationLayer.setVisible(visible);

        if (!visible)
            this.clearState();
    }

    updateSelected = (annotation, saveImmediately) =>
        new Promise(resolve => {
            if (this.state.selectedAnnotation) {
                if (saveImmediately) {
                    if (this.state.selectedAnnotation.isSelection) {
                        this.onCreateOrUpdateAnnotation('onAnnotationCreated', resolve)(annotation);
                    } else {
                        this.onCreateOrUpdateAnnotation('onAnnotationUpdated', resolve)(annotation, this.state.selectedAnnotation);
                    }
                } else {
                    this.setState({
                        selectedAnnotation: annotation, // Updated annotation
                        beforeHeadlessModify: this.state.beforeHeadlessModify || this.state.selectedAnnotation
                    }, resolve);
                }
            }
        });

    get widgets() {
        return this.state.widgets;
    }

    set widgets(widgets) {
        this.setState({widgets});
    }

    render() {
        // The editor should open under normal conditions - annotation was selected, no headless mode
        const open = this.state.selectedAnnotation && !this.state.editorDisabled;

        const readOnly = this.state.readOnly || this.state.selectedAnnotation?.readOnly;

        return (open && (
            <Editor
                detachable
                wrapperEl={this.props.wrapperEl}
                annotation={this.state.selectedAnnotation}
                modifiedTarget={this.state.modifiedTarget}
                selectedElement={this.state.selectedDOMElement}
                readOnly={readOnly}
                allowEmpty={this.props.config.allowEmpty}
                widgets={this.state.widgets}
                env={this.props.env}
                onAnnotationCreated={this.onCreateOrUpdateAnnotation('onAnnotationCreated')}
                onAnnotationUpdated={this.onCreateOrUpdateAnnotation('onAnnotationUpdated')}
                onAnnotationDeleted={this.onDeleteAnnotation}
                onCancel={this.onCancelAnnotation}/>
        ))
    }

}
